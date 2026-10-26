/** @file useCommandTreeGetFrom.ts — Get targets from local containers and corpses. */
import { executeCommandPanelInput } from './executeCommandPanelInput';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getGearTargetSuggestions } from '../objects/gearTargetSuggestions';
import { getCommandTreeGetFromTargets } from '../utils/commandTreeGet';
import type { CommandTargetSuggestion } from '../objects/targetSuggestionTypes';
import { useCorpseContentsStore } from '../stores/useCorpseContentsStore';
import type { useCommandTreeController } from './useCommandTreeController';

// --- From Target Model ---
interface GetFromTarget extends CommandTargetSuggestion {
    category: 'container' | 'corpse';
}

export const useCommandTreeGetFrom = (controller: ReturnType<typeof useCommandTreeController>) => {
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const requested = useRef(new Set<string>());
    const corpseContents = useCorpseContentsStore(state => state.contents);
    const pendingCorpseRequests = useCorpseContentsStore(state => state.pendingRequests);
    const inventory = controller.ui.displayInventoryLines || [];
    const equipment = controller.ui.displayEqLines || [];
    const roomItems = controller.game.roomItems || [];
    const roomNum = controller.game.roomNum;

    useEffect(() => {
        setSelectedKey(null);
        requested.current.clear();
    }, [roomNum]);

    const fromTargets = useMemo(() => getCommandTreeGetFromTargets(roomItems, inventory, equipment, roomNum),
        [roomItems, inventory, equipment, roomNum]);

    const fromSections = useMemo(() => [
        {label: 'From Room Containers', meta: 'room'},
        {label: 'From Inventory Containers', meta: 'inventory'},
        {label: 'From Worn Containers', meta: 'worn'}
    ].map(section => ({...section, targets: fromTargets.filter(target => target.meta === section.meta)}))
        .filter(section => section.targets.length > 0), [fromTargets]);
    const selected = fromTargets.find(target => target.key === selectedKey) || null;
    const contentLines = selected?.category === 'corpse'
        ? corpseContents[selected.containerId]
        : selected?.containerId ? controller.game.containerContents[selected.containerId] : undefined;
    const items = useMemo(() => contentLines ? getGearTargetSuggestions(contentLines, 'inventory') : [], [contentLines]);
    const loading = Boolean(selected && contentLines === undefined);

    const selectContainer = (target: GetFromTarget) => {
        setSelectedKey(target.key);
        controller.game.setCommandPreview?.(`get <item> ${target.value}`);
        const alreadyLoaded = target.category === 'corpse'
            ? corpseContents[target.containerId] !== undefined
            : controller.game.containerContents[target.containerId] !== undefined;
        const corpsePending = pendingCorpseRequests.some(request => request.containerId === target.containerId);
        if (alreadyLoaded || requested.current.has(target.key) || corpsePending) return;
        requested.current.add(target.key);

        if (target.category === 'corpse') {
            const command = `examine ${target.value}`;
            useCorpseContentsStore.getState().requestContents(target.containerId, target.value);
            controller.game.parser.setPendingFlags(true, true, command);
            controller.game.executeCommand(command, true, true, false, true, {fromUi: true, shouldFocus: false});
            return;
        }
        const command = target.containerCommand || `look in ${target.value}`;
        controller.game.parser.setLastRequestedContainerId?.(target.containerId);
        controller.game.parser.setPendingFlags(true, true, command);
        controller.game.executeCommand(command, true, true, false, true, {fromUi: true, shouldFocus: false});
    };

    const getItem = (item: CommandTargetSuggestion) => {
        if (!selected || controller.game.gameState !== 'playing' || controller.game.isSpectateMode) return;
        if (controller.isHelpMode) { controller.executeHelp('get'); return; }
        controller.dismissOutputs();
        const command = item.value === 'all'
            ? selected.category === 'corpse' ? `get all ${selected.value}` : `get all from ${selected.value}`
            : `get ${item.value} ${selected.value}`;
        executeCommandPanelInput(controller.game, command, false, false, false, false, {fromUi: true, shouldFocus: false});
        controller.game.setCommandPreview?.(null);
    };
    const getContainer = (target: GetFromTarget) => {
        if (controller.game.gameState !== 'playing' || controller.game.isSpectateMode) return;
        if (controller.isHelpMode) { controller.executeHelp('get'); return; }
        controller.dismissOutputs();
        executeCommandPanelInput(controller.game, `get ${target.value}`, false, false, false, false, {fromUi: true, shouldFocus: false});
        controller.game.setCommandPreview?.(null);
    };
    const previewItem = (item: CommandTargetSuggestion) => {
        if (!selected) return;
        const command = item.value === 'all'
            ? selected.category === 'corpse' ? `get all ${selected.value}` : `get all from ${selected.value}`
            : `get ${item.value} ${selected.value}`;
        controller.game.setCommandPreview?.(command);
    };

    const allItems: CommandTargetSuggestion[] = selected
        ? [{key: `get-all-from:${selected?.key || ''}`, label: 'All', value: 'all', meta: 'container'}, ...items]
        : items;
    return {fromSections, selected, items: allItems, loading, selectContainer, getContainer, getItem, previewItem,
        clearSelection: () => { setSelectedKey(null); controller.game.setCommandPreview?.('get'); },
        disabled: controller.game.gameState !== 'playing' || controller.game.isSpectateMode};
};
