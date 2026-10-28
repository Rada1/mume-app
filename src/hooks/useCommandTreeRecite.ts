/** @file useCommandTreeRecite.ts — Stage an inventory scroll before choosing a room entity. */
import { useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import type { CustomButton } from '../types';
import type { useCommandTreeController } from './useCommandTreeController';

// --- Recite Target Flow Section ---
export const useCommandTreeRecite = (
    controller: ReturnType<typeof useCommandTreeController>,
    command: CustomButton,
    targets: CommandActionTargetEntry[],
    onCommandExecuted?: () => void
) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const scrolls = targets.filter(entry => entry.group === 'inventory');
    const selectedScroll = scrolls.find(entry => entry.id === selectedId) || null;
    const roomEntities = useMemo(() => {
        const characterName = controller.game.characterName || '';
        const ownName = characterName.trim().toLowerCase();
        const self: CommandActionTargetEntry = {
            id: 'command-panel-self', label: 'Self', keyword: 'self', context: 'self',
            category: 'cat-ally', group: 'players', scope: 'self'
        };
        const roomCharacters = controller.entries.filter(entry => entry.scope === 'room'
            && ['players', 'npcs'].includes(entry.group) && entry.category !== 'cat-exit'
            && ![entry.label, entry.keyword, entry.context].some(value => value.trim().toLowerCase() === ownName));
        return [self, ...roomCharacters];
    }, [controller.entries, controller.game.characterName]);

    const scrollArgument = (entry: CommandActionTargetEntry) => {
        const name = (entry.gearRow?.name || '').split(';', 1)[0].trim().toLowerCase();
        if (/^(?:azure|black|blue|purple|vellum|clear ivory|ivory|ebony) scroll$/.test(name)
            || name === 'obsidian eye') return name;
        return entry.keyword || entry.context;
    };
    const chooseScroll = (entry: CommandActionTargetEntry) => {
        setSelectedId(entry.id);
        controller.game.setCommandPreview?.(`recite ${scrollArgument(entry)}`);
        controller.previewEntity(entry);
    };
    const previewTarget = (entry: CommandActionTargetEntry) => {
        if (!selectedScroll) return;
        controller.game.setCommandPreview?.(`recite ${scrollArgument(selectedScroll)} ${entry.context}`);
        if (entry.scope === 'self') controller.previewTargetContext('self');
        else controller.previewEntity(entry);
    };
    const recite = (entry: CommandActionTargetEntry, event: MouseEvent<HTMLButtonElement>) => {
        if (controller.isHelpMode) { controller.executeHelp('recite'); return; }
        if (!selectedScroll || controller.game.gameState !== 'playing' || controller.game.isSpectateMode) return;
        const syntax = `recite ${scrollArgument(selectedScroll)} ${entry.context}`.trim();
        controller.dismissOutputs();
        controller.game.handleButtonClick({...command, actionType: 'command', command: syntax}, event);
        onCommandExecuted?.();
    };
    return {scrolls, selectedScroll, roomEntities, scrollArgument, chooseScroll, previewTarget, recite};
};
