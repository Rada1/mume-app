/** @file useCommandMagicKeys.ts — Saved destinations for keyed spell command buttons. */
import { useEffect, useState, type MouseEvent } from 'react';
import type { CustomButton, TeleportTarget } from '../types';
import type { useCommandTreeController } from './useCommandTreeController';
import { useSettingsStore } from '../stores/useSettingsStore';
import { buildKeyedSpellCommand, parseKeyedSpellCommand, pruneExpiredMagicKeys } from '../utils/magicKeyUtils';

// --- Saved destination lifetime and execution ---
export const useCommandMagicKeys = (controller: ReturnType<typeof useCommandTreeController>, button: CustomButton,
    onExecuted?: () => void) => {
    const saved = useSettingsStore(state => state.teleportTargets);
    const [now, setNow] = useState(Date.now);
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);
    const spell = parseKeyedSpellCommand(button.command);
    const targets = pruneExpiredMagicKeys(saved, now).sort((a, b) => Number(Boolean(b.isFavorite)) - Number(Boolean(a.isFavorite)));
    const commandFor = (target: TeleportTarget) => spell ? buildKeyedSpellCommand(spell.prefix, target) : '';
    const disabled = controller.game.gameState !== 'playing' || controller.game.isSpectateMode;
    const choose = (target: TeleportTarget, event: MouseEvent) => {
        if (disabled || !spell || !pruneExpiredMagicKeys([target]).length) return;
        const command = commandFor(target);
        if (controller.isHelpMode) controller.executeHelp(command, button.label);
        else controller.game.handleButtonClick({...button, command, actionType: 'command'}, event);
        controller.game.setCommandPreview?.(null);
        onExecuted?.();
    };
    return {targets, now, disabled, choose, preview: (target: TeleportTarget) => controller.game.setCommandPreview?.(commandFor(target))};
};
