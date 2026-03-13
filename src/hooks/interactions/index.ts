export * from './types';
export * from './useButtonHandlers';
export * from './useInputHandlers';
export * from './useLogHandlers';
export * from './useDragHandlers';

import { InteractionDeps } from './types';
import { useButtonHandlers } from './useButtonHandlers';
import { useInputHandlers } from './useInputHandlers';
import { useLogHandlers } from './useLogHandlers';
import { useDragHandlers } from './useDragHandlers';

export const useInteractionHandlers = (deps: InteractionDeps) => {
    const { handleButtonClick } = useButtonHandlers(deps);
    const { handleInputSwipe } = useInputHandlers(deps);
    const { handleLogClick, handleLogDoubleClick, handleLogPointerDown, handleLogPointerUp } = useLogHandlers(deps);
    const { handleDragStart, handleDragEnd } = useDragHandlers(deps);

    return {
        handleButtonClick,
        handleInputSwipe,
        handleLogClick,
        handleLogDoubleClick,
        handleLogPointerDown,
        handleLogPointerUp,
        handleDragStart,
        handleDragEnd
    };
};
