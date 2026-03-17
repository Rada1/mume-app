import { InteractionDeps } from '../useInteractionHandlers';

export const useLogDragAndDrop = (_deps: InteractionDeps) => {

    const handleDragStart = (e: React.DragEvent) => {
        // Cancel HTML5 DnD — we use pointer-based drag instead
        e.preventDefault();
    };

    const handleDragEnd = (_e: React.DragEvent) => {
        // No-op — pointer-based drag handles all cleanup
    };

    return { handleDragStart, handleDragEnd };
};
