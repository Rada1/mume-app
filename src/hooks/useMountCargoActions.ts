/** @file useMountCargoActions.ts — Sequential corpse-to-mount and shop-sale workflows. */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DrawerLine } from '../types';
import { useCorpseContentsStore } from '../stores/useCorpseContentsStore';
import { useMessageStore } from '../stores/useMessageStore';
import { useRoomStore } from '../stores/useRoomStore';
import { getDrawerObjectKeyword } from '../objects/objectTargetModel';
import { getCargoItemGroups, getValuableLootGroups, makeItemSelector } from '../utils/mountCargoUtils';

type ExecuteCommand = (command: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;

interface MountCargoActionsArgs {
    executeCommand: ExecuteCommand;
    inventoryLines: DrawerLine[];
}

const wait = (milliseconds: number): Promise<void> => new Promise(resolve => window.setTimeout(resolve, milliseconds));
const outputText = (text: string): string => text.replace(/\x1b\[[0-9;]*m/g, '').replace(/<[^>]*>/g, '').trim();
const hasGotItem = (lines: string[]): boolean => lines.some(line => /\byou (?:get|take|pick(?:\s+up)?)\b/i.test(outputText(line)));
const hasGivenItem = (lines: string[]): boolean => lines.some(line => /\byou (?:give|hand|pass)\b/i.test(outputText(line)));
const hasSoldItem = (lines: string[]): boolean => lines.some(line => /\byou sell\b/i.test(outputText(line)));
const hasDroppedItem = (lines: string[]): boolean => lines.some(line => /\bdrops?\b/i.test(outputText(line)));
const countKeyword = (lines: DrawerLine[], keyword: string): number => lines.filter(line =>
    line.isItem && !line.isHeader && getDrawerObjectKeyword(line) === keyword
).length;

const latestPrompt = () => [...useMessageStore.getState().user].reverse().find(message => message.type === 'prompt');

// --- Logic Section ---
export const useMountCargoActions = ({ executeCommand, inventoryLines }: MountCargoActionsArgs) => {
    const inventoryRef = useRef(inventoryLines);
    inventoryRef.current = inventoryLines;
    const executeRef = useRef(executeCommand);
    executeRef.current = executeCommand;
    const busyRef = useRef(false);
    const [isBusy, setIsBusy] = useState(false);
    const [status, setStatus] = useState('');

    useEffect(() => {
        if (!status || isBusy) return;
        const timeout = window.setTimeout(() => setStatus(''), 15000);
        return () => window.clearTimeout(timeout);
    }, [isBusy, status]);

    const sendAndWait = useCallback((command: string, startRoom: string): Promise<string[]> => new Promise((resolve, reject) => {
        const previousPrompt = latestPrompt();
        const startedAt = Date.now();
        let unsubscribe = () => {};
        const timeoutId = window.setTimeout(() => {
            unsubscribe();
            reject(new Error(`No response to “${command}”. Stopped for safety.`));
        }, 20000);
        unsubscribe = useMessageStore.subscribe(state => {
            const prompt = [...state.user].reverse().find(message =>
                message.type === 'prompt' && message.timestamp >= startedAt && message.id !== previousPrompt?.id
            );
            if (!prompt) return;
            window.clearTimeout(timeoutId);
            unsubscribe();
            const response = state.user
                .filter(message => message.timestamp >= startedAt && message.type !== 'prompt' && message.type !== 'user')
                .map(message => message.textOnly || message.textRaw)
                .filter(Boolean);
            resolve(response);
        });
        if (String(useRoomStore.getState().roomNum ?? '') !== startRoom) {
            window.clearTimeout(timeoutId);
            unsubscribe();
            reject(new Error('Stopped because you changed rooms.'));
            return;
        }
        executeRef.current(command, true, true, false, true);
    }), []);

    const waitForInventoryUpdate = useCallback(async (previous: DrawerLine[]): Promise<DrawerLine[]> => {
        for (let attempt = 0; attempt < 30 && inventoryRef.current === previous; attempt += 1) await wait(50);
        return inventoryRef.current;
    }, []);

    const refreshInventory = useCallback(async (startRoom: string): Promise<DrawerLine[]> => {
        const previous = inventoryRef.current;
        await sendAndWait('inventory', startRoom);
        return waitForInventoryUpdate(previous);
    }, [sendAndWait, waitForInventoryUpdate]);

    const examineContents = useCallback(async (id: string, target: string, startRoom: string): Promise<DrawerLine[]> => {
        useCorpseContentsStore.getState().requestContents(id, target);
        await sendAndWait(`examine ${target}`, startRoom);
        return useCorpseContentsStore.getState().contents[id] || [];
    }, [sendAndWait]);

    const runAction = useCallback(async (initialStatus: string, action: (startRoom: string) => Promise<string>): Promise<void> => {
        if (busyRef.current) return;
        busyRef.current = true;
        setIsBusy(true);
        setStatus(initialStatus);
        const startRoom = String(useRoomStore.getState().roomNum ?? '');
        try {
            setStatus(await action(startRoom));
        } catch (error) {
            setStatus(error instanceof Error ? error.message : 'The cargo action stopped for safety.');
        } finally {
            busyRef.current = false;
            setIsBusy(false);
        }
    }, []);

    const collectValuables = useCallback(async (corpseId: string, corpseTarget: string, mountTarget: string | null,
        startRoom: string, inventory: DrawerLine[]): Promise<string> => {
        const contents = await examineContents(corpseId, corpseTarget, startRoom);
        const groups = getValuableLootGroups(contents);
        if (!groups.length) return 'No valuable items found on this corpse.';
        let transferred = 0;
        let lootedItems = 0;
        let lootedCoins = false;
        try {
            for (const group of groups) {
                const baseline = group.keyword === 'mail' && group.bulk
                    ? inventory.filter(line => line.isItem && !line.isHeader && /\bmail\b/i.test(`${line.text} ${line.context || ''}`)).length
                    : countKeyword(inventory, group.keyword);
                const selections = group.bulk ? [`all.${group.keyword}`] : group.targets.map(target => makeItemSelector(target.keyword, target.ordinal));
                let removed = 0;
                for (const selector of selections) {
                    const adjusted = group.bulk ? selector : makeItemSelector(group.keyword, Math.max(1, Number(selector.match(/^(\d+)\./)?.[1] || 1) - removed));
                    const response = await sendAndWait(`get ${adjusted} ${corpseTarget}`, startRoom);
                    if (!hasGotItem(response)) return `Stopped at ${group.label}; remaining loot stayed on the corpse.`;
                    const count = group.bulk ? group.targets.length : 1;
                    removed += count;
                    if (group.isCurrency) { lootedCoins = true; continue; }
                    lootedItems += count;
                    if (!mountTarget) continue;
                    for (let index = 0; index < count; index += 1) {
                        const inventorySelector = makeItemSelector(group.keyword, baseline + 1);
                        const given = await sendAndWait(`give ${inventorySelector} ${mountTarget}`, startRoom);
                        if (!hasGivenItem(given)) {
                            const verified = await refreshInventory(startRoom);
                            const remaining = group.keyword === 'mail' && group.bulk
                                ? verified.filter(line => line.isItem && !line.isHeader && /\bmail\b/i.test(`${line.text} ${line.context || ''}`)).length
                                : countKeyword(verified, group.keyword);
                            if (remaining !== baseline) return `Could not give ${group.label} to the mount; it remains in your inventory.`;
                            break;
                        }
                        transferred += 1;
                    }
                }
            }
            if (!mountTarget) {
                const itemText = `${lootedItems} valuable ${lootedItems === 1 ? 'item' : 'items'}`;
                return lootedCoins ? lootedItems ? `Looted ${itemText} and coins into your inventory.` : 'Looted coins into your inventory.'
                    : `Looted ${itemText} into your inventory.`;
            }
            if (lootedCoins && transferred === 0) return 'Looted coins; no other valuable items to give to the mount.';
            if (lootedCoins) return `Looted coins and gave ${transferred} valuable ${transferred === 1 ? 'item' : 'items'} to the mount.`;
            return `Gave ${transferred} valuable ${transferred === 1 ? 'item' : 'items'} to the mount.`;
        } finally {
            useCorpseContentsStore.getState().invalidateContents(corpseId);
        }
    }, [examineContents, refreshInventory, sendAndWait]);

    const lootValuables = useCallback((corpseId: string, corpseTarget: string, mountTarget: string | null) => {
        void runAction('Looting valuables…', async startRoom => {
            const inventory = mountTarget ? await refreshInventory(startRoom) : [];
            return collectValuables(corpseId, corpseTarget, mountTarget, startRoom, inventory);
        });
    }, [collectValuables, refreshInventory, runAction]);

    const lootAllValuables = useCallback((corpses: Array<{containerId: string; commandTarget: string}>, mountTarget: string | null = null) => {
        void runAction('Looting valuables…', async startRoom => {
            const inventory = mountTarget ? await refreshInventory(startRoom) : [];
            let looted = 0;
            for (const corpse of corpses) {
                const result = await collectValuables(corpse.containerId, corpse.commandTarget, mountTarget, startRoom, inventory);
                if (/^(?:Stopped|Could not|Unable)/i.test(result)) return result;
                if (!/^No valuable/i.test(result)) looted += 1;
            }
            return looted ? `Looted valuables from ${looted} ${looted === 1 ? 'corpse' : 'corpses'}${mountTarget ? ' to the mount' : ''}.` : 'No valuable items found.';
        });
    }, [collectValuables, refreshInventory, runAction]);

    const transferLootToMount = useCallback((items: Array<{target: string; label: string}>, mountTarget: string,
        corpse?: {containerId: string; commandTarget: string}) => {
        void runAction('Giving loot to mount…', async startRoom => {
            const initialInventory = await refreshInventory(startRoom);
            const baseline = new Map<string, number>();
            initialInventory.filter(line => line.isItem && !line.isHeader).forEach(line => {
                const keyword = getDrawerObjectKeyword(line);
                if (keyword) baseline.set(keyword, (baseline.get(keyword) || 0) + 1);
            });
            const ordered = [...items].sort((a, b) => {
                const noun = (target: string) => target.replace(/^\d+\./, '');
                const ordinal = (target: string) => Number(target.match(/^(\d+)\./)?.[1] || 1);
                return noun(a.target).localeCompare(noun(b.target)) || ordinal(b.target) - ordinal(a.target);
            });
            let transferred = 0;
            try {
                for (const item of ordered) {
                    const keyword = item.target.replace(/^\d+\./, '');
                    const response = await sendAndWait(`get ${item.target}${corpse ? ` ${corpse.commandTarget}` : ''}`, startRoom);
                    if (!hasGotItem(response)) return `Stopped at ${item.label}; remaining loot was left in place.`;
                    if (/^(?:coins?|gold|silver|copper|lauren|celeb|busc)$/i.test(keyword)) continue;
                    const inventorySelector = makeItemSelector(keyword, (baseline.get(keyword) || 0) + 1);
                    const given = await sendAndWait(`give ${inventorySelector} ${mountTarget}`, startRoom);
                    if (!hasGivenItem(given)) {
                        const verified = await refreshInventory(startRoom);
                        if (countKeyword(verified, keyword) !== (baseline.get(keyword) || 0)) {
                            return `Could not give ${item.label} to the mount; it remains in your inventory.`;
                        }
                    }
                    transferred += 1;
                }
                return `Gave ${transferred} ${transferred === 1 ? 'item' : 'items'} to the mount.`;
            } finally {
                if (corpse) await examineContents(corpse.containerId, corpse.commandTarget, startRoom);
            }
        });
    }, [examineContents, refreshInventory, runAction, sendAndWait]);

    const sellMountLoot = useCallback(() => {
        void runAction('Checking mount cargo…', async startRoom => {
            const initialInventory = await refreshInventory(startRoom);
            const baseline = new Map<string, number>();
            initialInventory.filter(line => line.isItem && !line.isHeader).forEach(line => {
                const keyword = getDrawerObjectKeyword(line);
                if (keyword) baseline.set(keyword, (baseline.get(keyword) || 0) + 1);
            });
            let sold = 0;
            const returned: string[] = [];

            const cargo = await examineContents('mount:current', 'mount', startRoom);
            const groups = getCargoItemGroups(cargo);
            for (const group of groups) {
                for (let occurrence = 0; occurrence < group.count; occurrence += 1) {
                    const unsaddleLines = await sendAndWait(`unsaddle mount ${group.keyword}`, startRoom);
                    if (!hasDroppedItem(unsaddleLines)) {
                        return `Could not confirm ${group.label} was unsaddled from your mount. Stopped before pickup or sale.`;
                    }
                    await sendAndWait(`get ${group.keyword}`, startRoom);
                    const inventory = await refreshInventory(startRoom);
                    const expectedCount = (baseline.get(group.keyword) || 0) + 1;
                    const actualCount = countKeyword(inventory, group.keyword);
                    if (actualCount !== expectedCount) {
                        return `Stopped at ${group.label}; it was unsaddled, but inventory did not confirm pickup. No sale was attempted.`;
                    }

                    const selector = makeItemSelector(group.keyword, expectedCount);
                    const saleLines = await sendAndWait(`sell ${selector}`, startRoom);
                    if (hasSoldItem(saleLines)) {
                        sold += 1;
                        continue;
                    }

                    await sendAndWait(`give ${selector} mount`, startRoom);
                    const restoredInventory = await refreshInventory(startRoom);
                    const restoredCount = countKeyword(restoredInventory, group.keyword);
                    if (restoredCount !== (baseline.get(group.keyword) || 0)) {
                        return `Could not confirm ${group.label} was returned to your mount. Stopped for safety.`;
                    }
                    returned.push(`${group.label} (your mount)`);
                    break;
                }
            }

            const returnedText = returned.length ? ` Returned ${returned.join(', ')} to your mount.` : '';
            return sold ? `Sold ${sold} ${sold === 1 ? 'item' : 'items'}.${returnedText}`
                : returned.length ? `The shop refused the cargo.${returnedText}` : 'No mount cargo found to sell.';
        });
    }, [examineContents, refreshInventory, runAction, sendAndWait]);

    return { isBusy, status, lootValuables, lootAllValuables, transferLootToMount, sellMountLoot };
};
