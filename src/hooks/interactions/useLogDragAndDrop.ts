import { InteractionDeps } from '../useInteractionHandlers';

export const useLogDragAndDrop = (deps: InteractionDeps) => {
    const { triggerHaptic, setActiveDragData, setUI } = deps;

    const handleDragStart = (e: React.DragEvent) => {
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

            // Desktop: listen for drag approaching the right edge and peek the drawer
            // so the user doesn't have to open it manually before dragging.
            const handleDocDragOver = (ev: DragEvent) => {
                const nearEdge = ev.clientX > window.innerWidth - 120;
                const drawerEl = document.querySelector('.right-drawer') as HTMLElement | null;
                if (nearEdge) {
                    if (drawerEl && !drawerEl.classList.contains('open')) {
                        // Drawer is closed — open it while dragging
                        setUI((prev: any) => prev.drawer === 'items' ? prev : { ...prev, drawer: 'items' });
                    }
                    drawerEl?.classList.add('native-drag-over');
                } else {
                    drawerEl?.classList.remove('native-drag-over');
                }
            };

            document.addEventListener('dragover', handleDocDragOver);

            // Store cleanup ref on the element so handleDragEnd can remove it
            (targetEl as any)._docDragOverHandler = handleDocDragOver;
        }
    };

    const handleDragEnd = (e: React.DragEvent) => {
        const targetEl = (e.target as HTMLElement).closest('.inline-btn') as HTMLElement;
        if (targetEl) {
            targetEl.classList.remove('dragging');
            const handler = (targetEl as any)._docDragOverHandler;
            if (handler) {
                document.removeEventListener('dragover', handler);
                delete (targetEl as any)._docDragOverHandler;
            }
        }
        document.querySelector('.right-drawer')?.classList.remove('native-drag-over');
        setActiveDragData(null);
    };

    return { handleDragStart, handleDragEnd };
};
