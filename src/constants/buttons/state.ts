/** @file state.ts — Command-panel buttons for the player's own state controls. */

import type { CustomButton } from '../../types';
import { createButton } from '../../utils/buttonFactory';
import { ALERTNESS_OPTIONS, MOOD_OPTIONS, POSITION_OPTIONS, SPELL_SPEED_OPTIONS, type StateOption } from '../../utils/playerStateOptions';

// --- State Button Groups ---
const makeStateButtons = (group: string, color: string, options: StateOption[]): CustomButton[] => options
    .filter((option): option is StateOption & { command: string } => Boolean(option.command))
    .map(option => ({
        ...createButton({
            id: `command-state-${group.toLowerCase().replace(/\s+/g, '-')}-${option.value}`,
            label: option.label,
            command: option.command,
            setId: 'trait-state',
            color,
            shape: 'rect',
            width: 140,
            height: 32
        }),
        inlineSubgroup: group
    }));

export const SELF_STATE_BUTTONS: CustomButton[] = [
    ...makeStateButtons('Position', '#3b82f6', POSITION_OPTIONS),
    ...makeStateButtons('Mood', '#ef4444', MOOD_OPTIONS),
    ...makeStateButtons('Cast Speed', '#a855f7', SPELL_SPEED_OPTIONS),
    ...makeStateButtons('Alertness', '#c9a84c', ALERTNESS_OPTIONS)
];

export const SELF_STATE_BUTTON_IDS = SELF_STATE_BUTTONS.map(button => button.id);
