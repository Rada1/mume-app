/** @file useMountCargoActions.ts — Sequential corpse-to-mount and shop-sale workflows. */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DrawerLine } from '../types';
import type { CommandTargetSuggestion } from '../objects/targetSuggestionTypes';
import { useCorpseContentsStore } from '../stores/useCorpseContentsStore';
import { useMessageStore } from '../stores/useMessageStore';
import { useRoomStore } from '../stores/useRoomStore';
import { getDrawerObjectKeyword } from '../objects/objectTargetModel';
import { getCargoItemGroups, getValuableLootTargets, makeItemSelector } from '../utils/mountCargoUtils';

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

    const lootValuables = useCallback((corpseId: string, corpseTarget: string, mountTarget: string) => {
        void runAction('Looting valuables…', async startRoom => {
            const initialInventory = await refreshInventory(startRoom);
            const baseline = new Map<string, number>();
            initialInventory.filter(line => line.isItem && !line.isHeader).forEach(line => {
                const noun = getDrawerObjectKeyword(line);
                if (noun) baseline.set(noun, (baseline.get(noun) || 0) + 1);
            });
            const contents = await examineContents(corpseId, corpseTarget, startRoom);
            const valuableTargets = getValuableLootTargets(contents);
            if (!valuableTargets.length) return 'No valuable items found on this corpse.';

            let transferred = 0;
            const removedByKeyword = new Map<string, number>();
            for (const item of valuableTargets) {
                const corpseOrdinal = item.ordinal - (removedByKeyword.get(item.keyword) || 0);
                const corpseSelector = makeItemSelector(item.keyword, corpseOrdinal);
                const getLines = await sendAndWait(`get ${corpseSelector} ${corpseTarget}`, startRoom);
                if (!hasGotItem(getLines)) return `Stopped at ${item.label}; remaining loot stayed on the corpse.`;
                removedByKeyword.set(item.keyword, (removedByKeyword.get(item.keyword) || 0) + 1);
                const inventorySelector = makeItemSelector(item.keyword, (baseline.get(item.keyword) || 0) + 1);
                const giveLines = await sendAndWait(`give ${inventorySelector} ${mountTarget}`, startRoom);
                if (!hasGivenItem(giveLines)) {
                    const verifiedInventory = await refreshInventory(startRoom);
                    if (countKeyword(verifiedInventory, item.keyword) !== (baseline.get(item.keyword) || 0)) {
                        return `Could not give ${item.label} to the mount; it remains in your inventory.`;
                    }
                }
                transferred += 1;
            }
            return `Gave ${transferred} valuable ${transferred === 1 ? 'item' : 'items'} to the mount.`;
        });
    }, [examineContents, refreshInventory, runAction, sendAndWait]);

    const sellMountLoot = useCallback((mounts: CommandTargetSuggestion[]) => {
        void runAction('Checking mount cargo…', async startRoom => {
            const initialInventory = await refreshInventory(startRoom);
            const baseline = new Map<string, number>();
            initialInventory.filter(line => line.isItem && !line.isHeader).forEach(line => {
                const keyword = getDrawerObjectKeyword(line);
                if (keyword) baseline.set(keyword, (baseline.get(keyword) || 0) + 1);
            });
            let sold = 0;
            const returned: string[] = [];

            for (const mount of mounts) {
                const cargo = await examineContents(`mount:${mount.key}`, mount.value, startRoom);
                const groups = getCargoItemGroups(cargo);
                for (const group of groups) {
                    for (let occurrence = 0; occurrence < group.count; occurrence += 1) {
                        const unsaddleLines = await sendAndWait(`unsaddle ${mount.value} ${group.keyword}`, startRoom);
                        if (!hasDroppedItem(unsaddleLines)) {
                            return `Could not confirm ${group.label} was unsaddled from ${mount.label}. Stopped before pickup or sale.`;
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

                        await sendAndWait(`give ${selector} ${mount.value}`, startRoom);
                        const restoredInventory = await refreshInventory(startRoom);
                        const restoredCount = countKeyword(restoredInventory, group.keyword);
                        if (restoredCount !== (baseline.get(group.keyword) || 0)) {
                            return `Could not confirm ${group.label} was returned to ${mount.label}. Stopped for safety.`;
                        }
                        returned.push(`${group.label} (${mount.label})`);
                        break;
                    }
                }
            }

            const returnedText = returned.length ? ` Returned ${returned.join(', ')} to their mounts.` : '';
            return sold ? `Sold ${sold} ${sold === 1 ? 'item' : 'items'}.${returnedText}`
                : returned.length ? `The shop refused the cargo.${returnedText}` : 'No mount cargo found to sell.';
        });
    }, [examineContents, refreshInventory, runAction, sendAndWait]);

    return { isBusy, status, lootValuables, sellMountLoot };
};
