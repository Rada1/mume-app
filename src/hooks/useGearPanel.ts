/** @file useGearPanel.ts — Captured gear lists, refresh, and container expansion. */
import { useMemo } from 'react';
import { useGame, useUI } from '../context/GameContext';
import type { DrawerLine } from '../types';
import { getContainerCommand, getGearRecipients, sortWornGearRows, toGearRow, toNearbyGearRows, type GearRow } from '../utils/gearPanelUtils';

// --- Logic Section ---
export function useGearPanel() {
    const { displayEqLines, displayInventoryLines } = useUI();
    const {
        viewport, triggerHaptic, executeCommand, parser,
        characterName, roomChars, roomPlayers, roomNpcs, roomItems,
        expandedContainers, setExpandedContainers, containerContents,
    } = useGame();
    const worn = useMemo(() => sortWornGearRows(
        displayEqLines.map(toGearRow).filter((row): row is GearRow => row !== null)
    ), [displayEqLines]);
    const carried = useMemo(() => displayInventoryLines.map(toGearRow).filter(row => row !== null), [displayInventoryLines]);
    const nearby = useMemo(() => toNearbyGearRows(roomItems), [roomItems]);
    const roomItemLines = useMemo(() => nearby.map(row => row.line), [nearby]);
    const recipients = useMemo(() => {
        const chars = Object.values(roomChars || {});
        const sources = chars.length ? chars : [...roomPlayers, ...roomNpcs];
        return getGearRecipients(sources, characterName || '');
    }, [characterName, roomChars, roomNpcs, roomPlayers]);

    // Initial snapshots are requested centrally by useGameParser. Avoid a second
    // startup pair here because each request rewrites the shared capture stage.
    const refresh = (section: 'worn' | 'carried') => {
        triggerHaptic?.(10);
        executeCommand(section === 'worn' ? 'equipment' : 'inventory', true, true, false, true);
    };

    const toggleContainer = (line: DrawerLine, lines: DrawerLine[]) => {
        triggerHaptic?.(10);
        if (expandedContainers.has(line.id)) {
            setExpandedContainers(previous => {
                const next = new Set(previous);
                next.delete(line.id);
                return next;
            });
            return;
        }
        setExpandedContainers(previous => new Set(previous).add(line.id));
        const command = getContainerCommand(line, lines);
        if (!command) return;
        parser?.setPendingFlags?.(true, true, command);
        parser?.setLastRequestedContainerId?.(line.id);
        executeCommand(command, true, true, false, true);
    };

    const refreshContainer = (containerId: string) => {
        const sources = [displayEqLines, displayInventoryLines, roomItemLines, ...Object.values(containerContents)];
        const lines = sources.find(candidate => candidate.some(line => line.id === containerId));
        const line = lines?.find(candidate => candidate.id === containerId);
        if (!line || !lines) return;
        const command = getContainerCommand(line, lines);
        if (!command) return;
        parser?.setPendingFlags?.(true, true, command);
        parser?.setLastRequestedContainerId?.(containerId);
        executeCommand(command, true, true, false, true);
    };

    return { viewport, worn, carried, nearby, roomItemLines, recipients, displayEqLines, displayInventoryLines,
        expandedContainers, containerContents, refresh, toggleContainer, refreshContainer, executeCommand, triggerHaptic };
}
