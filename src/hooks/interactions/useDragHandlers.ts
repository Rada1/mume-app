import { useCallback } from 'react';
import { InteractionDeps } from './types';

export const useDragHandlers = (deps: InteractionDeps) => {
    const { triggerHaptic, setActiveDragData } = deps;

    const handleDragStart = useCallback((e: React.DragEvent) => {
        const targetEl = (e.target as HTMLElement).closest('.inline-btn') as HTMLElement;
        if (!targetEl) return;

        const cmd = targetEl.getAttribute('data-cmd');
        const context = targetEl.getAttribute('data-context');
        const id = targetEl.getAttribute('data-id');

        if (context) {
            const dragData = {
                type: 'inline-btn',
                cmd: cmd,
                context: context,
                id: id
            };

            setActiveDragData(dragData);
            const jsonStr = JSON.stringify(dragData);
            e.dataTransfer.setData('application/json', jsonStr);
            e.dataTransfer.setData('text/plain', jsonStr);
            e.dataTransfer.effectAllowed = 'move';
            targetEl.classList.add('dragging');
            triggerHaptic(10);
        }
    }, [triggerHaptic, setActiveDragData]);

    const handleDragEnd = useCallback((e: React.DragEvent) => {
        const targetEl = (e.target as HTMLElement).closest('.inline-btn') as HTMLElement;
        if (targetEl) {
            targetEl.classList.remove('dragging');
        }
        setActiveDragData(null);
    }, [setActiveDragData]);

    return { handleDragStart, handleDragEnd };
};
