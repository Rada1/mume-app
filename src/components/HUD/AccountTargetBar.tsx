/**
 * @file AccountTargetBar.tsx
 * @description Renders TacticalTargetBar populated with account characters when long-pressing play, info, or practice.
 */

// --- Logic Section ---
import React, { FC, useEffect, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { useAccountTargetStore } from '../../stores/useAccountTargetStore';
import { TacticalTargetBar } from '../Controls/GameButton/TacticalTargetBar';
import type { CommandTargetSuggestion } from '../../utils/commandSuggestionUtils';

export const AccountTargetBar: FC = () => {
    const { gameState, accountState, executeCommand, triggerHaptic, setTarget } = useGame();
    const isOpen = useAccountTargetStore(s => s.isOpen);
    const activeCmd = useAccountTargetStore(s => s.activeCmd);
    const selectedTarget = useAccountTargetStore(s => s.selectedTarget);
    const pressActive = useAccountTargetStore(s => s.pressActive);
    const closeMenu = useAccountTargetStore(s => s.closeMenu);
    const selectTarget = useAccountTargetStore(s => s.selectTarget);

    const suggestions: CommandTargetSuggestion[] = useMemo(() => {
        if (!accountState?.characters) return [];
        return accountState.characters.map((c, idx) => ({
            key: `account-char-${c.name}-${idx}`,
            label: c.name,
            value: c.name,
            meta: [c.race, c.level ? `Lvl ${c.level}` : null].filter(Boolean).join(' • ')
        }));
    }, [accountState?.characters]);

    useEffect(() => {
        if (!isOpen || !pressActive) return;
        const finishPress = () => {
            const current = useAccountTargetStore.getState();
            if (!current.isOpen || !current.pressActive) return;
            const command = current.activeCmd;
            const targetName = current.selectedTarget;
            closeMenu();
            if (command && targetName) {
                triggerHaptic?.(20);
                executeCommand(`${command} ${targetName}`);
            }
        };
        const cancelPress = () => closeMenu();
        window.addEventListener('pointerup', finishPress, true);
        window.addEventListener('pointercancel', cancelPress, true);
        return () => {
            window.removeEventListener('pointerup', finishPress, true);
            window.removeEventListener('pointercancel', cancelPress, true);
        };
    }, [isOpen, pressActive, closeMenu, triggerHaptic, executeCommand]);

    if (!isOpen || gameState !== 'account') return null;

    const title = activeCmd ? activeCmd.toUpperCase() : 'CHARACTERS';

    const handleSelectTarget = (targetName: string) => {
        if (useAccountTargetStore.getState().pressActive) {
            selectTarget(targetName);
            return;
        }
        triggerHaptic?.(20);
        closeMenu();
        if (activeCmd) {
            executeCommand(`${activeCmd} ${targetName}`);
        } else {
            setTarget(targetName);
        }
    };

    return (
        <TacticalTargetBar
            isOpen={isOpen}
            currentTarget={null}
            selectedTarget={selectedTarget}
            onSelectTarget={handleSelectTarget}
            roomOccupants={[]}
            roomItems={[]}
            suggestions={suggestions}
            title={title}
            onHoverTarget={selectTarget}
        />
    );
};
