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
    isToggle: boolean;
    active: boolean;
    command: string;
    statusLabel?: string;
}

export const getMovementModeActions = (state: MovementState): MovementModeAction[] => {
    const climbing = Boolean(state.climb && state.climb.toLowerCase() !== 'off');
    const sneaking = Boolean(state.sneak && state.sneak.toLowerCase() !== 'off');
    const riding = state.isRiding;

    return [
        { id: 'climb', label: 'Climb', isToggle: true, active: climbing, command: climbing ? 'climb off' : 'climb safe' },
        { id: 'swim', label: 'Swim', isToggle: true, active: state.isSwimming, command: 'swim' },
        { id: 'ride', label: 'Ride', isToggle: false, active: riding, command: riding ? 'lead' : 'ride', statusLabel: 'Riding' },
        { id: 'sneak', label: 'Sneak', isToggle: true, active: sneaking, command: 'sneak' },
        // MUME has no hide-off toggle; an active equipment check breaks hiding.
        { id: 'hidden', label: 'Hidden', isToggle: false, active: state.isHidden, command: state.isHidden ? 'equipment' : 'hide', statusLabel: 'Hidden' },
    ];
};
