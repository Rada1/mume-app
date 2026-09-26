/** @file useGearPanel.ts — Captured gear lists, refresh, and container expansion. */
import { useEffect, useMemo } from 'react';
import { useGame, useUI } from '../context/GameContext';
import type { DrawerLine } from '../types';
import { getContainerCommand, toGearRow } from '../utils/gearPanelUtils';

// --- Logic Section ---
export function useGearPanel() {
    const { displayEqLines, displayInventoryLines } = useUI();
    const {
        gameState, viewport, triggerHaptic, executeCommand, parser,
        expandedContainers, setExpandedContainers, containerContents,
    } = useGame();
    const worn = useMemo(() => displayEqLines.map(toGearRow).filter(row => row !== null), [displayEqLines]);
    const carried = useMemo(() => displayInventoryLines.map(toGearRow).filter(row => row !== null), [displayInventoryLines]);

    useEffect(() => {
        if (gameState !== 'playing') return;
        if (!displayEqLines.length) executeCommand('equipment', true, true, false, true);
        if (!displayInventoryLines.length) executeCommand('inventory', true, true, false, true);
    }, []);

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
        const sources = [displayEqLines, displayInventoryLines, ...Object.values(containerContents)];
        const lines = sources.find(candidate => candidate.some(line => line.id === containerId));
        const line = lines?.find(candidate => candidate.id === containerId);
        if (!line || !lines) return;
        const command = getContainerCommand(line, lines);
        if (!command) return;
        parser?.setPendingFlags?.(true, true, command);
        parser?.setLastRequestedContainerId?.(containerId);
        executeCommand(command, true, true, false, true);
    };

    return { viewport, worn, carried, displayEqLines, displayInventoryLines,
        expandedContainers, containerContents, refresh, toggleContainer, refreshContainer, executeCommand, triggerHaptic };
}
