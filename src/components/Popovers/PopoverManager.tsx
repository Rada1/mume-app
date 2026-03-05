import React, { useLayoutEffect } from 'react';
import { PopoverManagerProps, CustomButton } from '../../types';
import { DialMenu } from './DialMenu';
import { StandardMenuPopover } from './StandardMenuPopover';
import { RecipientSelectPopover } from './RecipientSelectPopover';
import { TeleportSavePopover, TeleportSelectPopover, TeleportManagePopover } from './TeleportPopovers';

export const PopoverManager: React.FC<PopoverManagerProps> = ({
    popoverState, setPopoverState, popoverRef, setButtons, addMessage, triggerHaptic, handleButtonClick, executeCommand, setTarget, buttons, availableSets, teleportTargets, setTeleportTargets, roomPlayers, setSettings
}) => {

    useLayoutEffect(() => {
        if (popoverState && popoverRef.current) {
            const el = popoverRef.current;
            const rect = el.getBoundingClientRect();
            const winH = window.innerHeight, winW = window.innerWidth;
            let top = popoverState.y, left = popoverState.x;

            if (popoverState.sourceHeight && top > winH / 2) {
                const potentialTop = top + popoverState.sourceHeight - rect.height;
                if (potentialTop >= 10) top = potentialTop;
            }
            if (top + rect.height > winH - 10) top = Math.max(10, winH - rect.height - 10);
            if (left + rect.width > winW - 10) left = Math.max(10, winW - rect.width - 10);
            el.style.top = `${top}px`; el.style.left = `${left}px`;
        }
    }, [popoverState, popoverRef]);

    React.useEffect(() => {
        if (!popoverState || popoverState.menuDisplay === 'dial') return;

        const handlePointerMove = (e: PointerEvent) => {
            // Find if pointer is over a menu item
            const elements = document.elementsFromPoint(e.clientX, e.clientY);
            const menuItem = elements.find(el => (el as HTMLElement).getAttribute('data-menu-item') === 'true') as HTMLElement;

            // Remove highlighting from all items FIRST
            document.querySelectorAll('.popover-item[data-menu-item="true"]').forEach(el => {
                el.classList.remove('active-drag');
            });

            // Then apply it only to the one under the pointer
            if (menuItem) {
                menuItem.classList.add('active-drag');
            }
        };

        const handlePointerUp = (e: PointerEvent) => {
            const elements = document.elementsFromPoint(e.clientX, e.clientY);
            const menuItem = elements.find(el => (el as HTMLElement).getAttribute('data-menu-item') === 'true') as HTMLElement;

            if (menuItem) {
                // Remove highlight immediately upon selection
                menuItem.classList.remove('active-drag');
                triggerHaptic(10);
                menuItem.click();
            }
        };

        window.addEventListener('pointermove', handlePointerMove, { passive: true });
        window.addEventListener('pointerup', handlePointerUp, { passive: true });

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [popoverState, triggerHaptic]);

    if (!popoverState) return null;

    if (popoverState.menuDisplay === 'dial') {
        return (
            <DialMenu
                setId={popoverState.setId}
                initialX={popoverState.initialPointerX ?? popoverState.x}
                initialY={popoverState.initialPointerY ?? popoverState.y}
                buttons={buttons} onClose={() => setPopoverState(null)}
                onExecute={(btn, e) => {
                    if (popoverState.assignSourceId) {
                        const isExecute = popoverState.executeAndAssign, dir = popoverState.assignSwipeDir;
                        setButtons((prev: CustomButton[]) => prev.map(b => b.id === popoverState.assignSourceId ? (dir ? { ...b, swipeCommands: { ...b.swipeCommands, [dir]: btn.command }, swipeActionTypes: { ...b.swipeActionTypes, [dir]: btn.actionType || 'command' } } : { ...b, command: btn.command, label: btn.label, actionType: btn.actionType || 'command' }) : b));
                        if (isExecute) handleButtonClick(btn, e as any, popoverState.context);
                        setPopoverState(null); addMessage('system', `${isExecute ? 'Executed and assigned' : 'Assigned'} '${btn.label}'${dir ? ` to swipe ${dir}` : ''}.`);
                    } else handleButtonClick(btn, e as any, popoverState.context);
                }}
                triggerHaptic={triggerHaptic}
                themeColor={setSettings[popoverState.setId]?.themeColor}
            />
        );
    }

    return (
        <div className="popover-menu" ref={popoverRef} style={{
            position: 'fixed',
            left: popoverState.x,
            top: popoverState.y,
            zIndex: 25000,
            '--accent': setSettings[popoverState.setId]?.themeColor || 'var(--set-accent, var(--accent))'
        } as any}>
            {popoverState.type === 'teleport-save' && <TeleportSavePopover popoverState={popoverState} setPopoverState={setPopoverState} setTeleportTargets={setTeleportTargets} addMessage={addMessage} />}
            {popoverState.type === 'teleport-select' && <TeleportSelectPopover popoverState={popoverState} setPopoverState={setPopoverState} teleportTargets={teleportTargets} executeCommand={executeCommand} />}
            {popoverState.type === 'teleport-manage' && <TeleportManagePopover teleportTargets={teleportTargets} setTeleportTargets={setTeleportTargets} setPopoverState={setPopoverState} />}
            {popoverState.type === 'give-recipient-select' && <RecipientSelectPopover popoverState={popoverState} roomPlayers={roomPlayers} executeCommand={executeCommand} setPopoverState={setPopoverState} />}
            {!popoverState.type && <StandardMenuPopover popoverState={popoverState} buttons={buttons} availableSets={availableSets} setPopoverState={setPopoverState} setButtons={setButtons} handleButtonClick={handleButtonClick} setTarget={setTarget} addMessage={addMessage} themeColor={setSettings[popoverState.setId]?.themeColor} />}
        </div>
    );
};
