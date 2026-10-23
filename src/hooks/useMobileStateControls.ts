/** @file useMobileStateControls.ts — State commands for the standalone mobile input row. */
import { useGame } from '../context/GameContext';
import { ALERTNESS_OPTIONS, MOOD_OPTIONS, POSITION_OPTIONS, SPELL_SPEED_OPTIONS, type StateOption } from '../utils/playerStateOptions';

// --- State Command Section ---
export function useMobileStateControls() {
    const game = useGame();
    const stance = ['riding', 'mounted'].includes((game.playerPosition || '').toLowerCase())
        ? 'standing' : game.playerPosition;
    const controls = [
        { label: 'Mood', value: game.mood, options: MOOD_OPTIONS, update: game.setMood },
        { label: 'Cast Speed', value: game.spellSpeed, options: SPELL_SPEED_OPTIONS, update: game.setSpellSpeed },
        { label: 'Alertness', value: game.alertness, options: ALERTNESS_OPTIONS, update: game.setAlertness },
        { label: 'Stance', value: stance, options: POSITION_OPTIONS, update: (value: string) => {
            if (game.playerPosition === 'sleeping' && value !== 'sleeping') game.executeCommand('wake');
            game.setPlayerPosition(value as 'standing' | 'sitting' | 'resting' | 'sleeping');
        } }
    ];
    const select = (control: typeof controls[number], option: StateOption) => {
        if (game.isSpectateMode || !option.command) return;
        control.update(option.value);
        game.executeCommand(option.command);
    };
    return { controls, select, disabled: game.isSpectateMode, interact: () => game.triggerHaptic(15) };
}
