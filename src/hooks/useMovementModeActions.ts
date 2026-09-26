/**
 * @file useMovementModeActions.ts
 * @description Builds server-backed movement controls and their toggle commands.
 */

// --- Logic Section ---
interface MovementState {
    climb?: string | null;
    isSwimming: boolean;
    isRiding: boolean;
    sneak?: string | null;
    isHidden: boolean;
}

export interface MovementModeAction {
    id: string;
    label: string;
    active: boolean;
    command: string;
}

export const getMovementModeActions = (state: MovementState): MovementModeAction[] => {
    const climbing = Boolean(state.climb && state.climb.toLowerCase() !== 'off');
    const sneaking = Boolean(state.sneak && state.sneak.toLowerCase() !== 'off');
    const riding = state.isRiding;

    return [
        { id: 'climb', label: 'Climb', active: climbing, command: climbing ? 'climb off' : 'climb safe' },
        { id: 'swim', label: 'Swim', active: state.isSwimming, command: 'swim' },
        { id: 'ride', label: 'Ride', active: riding, command: riding ? 'lead' : 'ride' },
        { id: 'sneak', label: 'Sneak', active: sneaking, command: 'sneak' },
        // MUME has no hide-off toggle; an active equipment check breaks hiding.
        { id: 'hidden', label: 'Hidden', active: state.isHidden, command: state.isHidden ? 'equipment' : 'hide' },
    ];
};
