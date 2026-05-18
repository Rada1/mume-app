import { useRef } from 'react';
import { InteractionDeps } from '../useInteractionHandlers';
import { useLogClicks } from './useLogClicks';
import { useLogPointer } from './useLogPointer';

export const useLogTaps = (deps: InteractionDeps) => {
    // Shared state between clicks and pointers (for preventing duplicate actions)
    const lookModFiredRef = useRef(false);
    // Set in pointerDown when a held (drawer/action) button fires via an inline tap target.
    // Checked in click to prevent the action menu from opening on the same tap.
    const heldBtnFiredRef = useRef(false);
    // Prevents the click event that always follows a long-press from un-toggling the
    // item that was just selected by the long press.
    const longPressJustFiredRef = useRef(false);

    const { handleLogClick, handleLogDoubleClick } = useLogClicks(deps, lookModFiredRef, longPressJustFiredRef, heldBtnFiredRef);
    const { handleLogPointerDown, handleLogPointerUp } = useLogPointer(deps, lookModFiredRef, longPressJustFiredRef, heldBtnFiredRef);

    return { 
        handleLogClick, 
        handleLogDoubleClick, 
        handleLogPointerDown, 
        handleLogPointerUp 
    };
};
