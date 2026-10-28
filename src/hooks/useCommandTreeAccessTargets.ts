/** @file useCommandTreeAccessTargets.ts — Grouped access targets and explicit execution context. */
import { useMemo } from 'react';
import { useMapper } from '../context/useMapper';
import { normalizeExitKey } from '../utils/gmcpExitUtils';
import type { CustomButton, PopoverState } from '../types';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import type { useCommandTreeController } from './useCommandTreeController';
import { getAccessTargetSections } from '../utils/commandTreeAccess';
// --- Target Context Section ---
const DIRECTION_LABELS: Record<string, string> = {
    n: 'North', ne: 'Northeast', e: 'East', se: 'Southeast',
    s: 'South', sw: 'Southwest', w: 'West', nw: 'Northwest', u: 'Up', d: 'Down'
};
export const useCommandTreeAccessTargets = (controller: ReturnType<typeof useCommandTreeController>, targets: CommandActionTargetEntry[]) => {
    const mapper = useMapper();
    const roomId = (mapper.currentRoomId || '').replace(/^m_/, '');
    const room = mapper.rooms[mapper.currentRoomId || ''] || mapper.rooms[roomId] || mapper.rooms[`m_${roomId}`];
    const sections = useMemo(() => getAccessTargetSections(targets.map(entry => {
        if (entry.category !== 'cat-exit') return entry;
        const direction = normalizeExitKey(entry.keyword || entry.context.replace(/^exit\s+/i, ''));
        const directionLabel = DIRECTION_LABELS[direction] || entry.label;
        const mappedExit = Object.entries(room?.exits || {}).find(([key]) => normalizeExitKey(key) === direction)?.[1];
        const doorName = entry.doorName?.trim() || mappedExit?.doorName?.trim() || 'door';
        return {...entry, label: directionLabel, doorName, hasDoor: true, keyword: direction, context: `exit ${direction}`};
    })), [targets, room, mapper.renderVersion]);
    const actionFor = (entry: CommandActionTargetEntry, button: CustomButton): CustomButton => entry.category === 'cat-exit'
        ? {...button, command: `${button.command.split(' ')[0]} exit ${entry.keyword}`} : button;
    const preview = (entry: CommandActionTargetEntry) => controller.previewEntity(entry);
    const targetState = (entry: CommandActionTargetEntry): PopoverState => ({
        x: 0, y: 0, type: 'menu', setId: entry.category, category: entry.category,
        context: entry.context, keyword: entry.keyword, displayName: entry.label, entityId: entry.id,
        parentNoun: entry.parentNoun, hasDoor: entry.hasDoor
    });
    return {sections, preview, targetState, actionFor};
};
