import { InteractionDeps } from '../useInteractionHandlers';

export const useLogDragAndDrop = (deps: InteractionDeps) => {
    const { triggerHaptic, setActiveDragData } = deps;

    const handleDragStart = (e: React.DragEvent) => {
        const targetEl = (e.target as HTMLElement).closest('.inline-btn') as HTMLElement;
        if (!targetEl) return;

        const cmd = targetEl.getAttribute('data-cmd');
        const context = targetEl.getAttribute('data-context');
        const id = targetEl.getAttribute('data-id');

        console.log('[DEBUG] Drag Start:', { cmd, context, id });

        if (context) {
            const dragData = {
                type: 'inline-btn',
                cmd: cmd,
                context: context,
                id: id
            };

            // Set global state for robust retrieval
            setActiveDragData(dragData);

            const jsonStr = JSON.stringify(dragData);
            console.log('[DEBUG] Setting Data:', jsonStr);

            // Set both types for maximum cross-browser compatibility
            e.dataTransfer.setData('application/json', jsonStr);
            e.dataTransfer.setData('text/plain', jsonStr);
            e.dataTransfer.effectAllowed = 'move';

            // Highlight that we're dragging
            targetEl.classList.add('dragging');

            triggerHaptic(10);
        }
    };

    const handleDragEnd = (e: React.DragEvent) => {
        const targetEl = (e.target as HTMLElement).closest('.inline-btn') as HTMLElement;
        if (targetEl) {
            targetEl.classList.remove('dragging');
        }
        // Always clear the global state
        console.log('[DEBUG] Drag End - Clearing Global State');
        setActiveDragData(null);
    };

    return { handleDragStart, handleDragEnd };
};
