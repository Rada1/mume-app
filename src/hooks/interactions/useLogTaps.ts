import { useRef } from 'react';
import { InteractionDeps } from '../useInteractionHandlers';
import { useLogClicks } from './useLogClicks';
import { useLogPointer } from './useLogPointer';

export const useLogTaps = (deps: InteractionDeps) => {
    // Shared state between clicks and pointers (for preventing duplicate actions)
    const lookModFiredRef = useRef(false);

    const { handleLogClick, handleLogDoubleClick } = useLogClicks(deps, lookModFiredRef);
    const { handleLogPointerDown, handleLogPointerUp } = useLogPointer(deps, lookModFiredRef);

    return { 
        handleLogClick, 
        handleLogDoubleClick, 
        handleLogPointerDown, 
        handleLogPointerUp 
    };
};
