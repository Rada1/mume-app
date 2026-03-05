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

            if (popoverState.initialPointerX !== undefined) {
                // Dial/Remote Mode: Perfectly centered
                top = (winH / 2) - (rect.height / 2);
                left = (winW / 2) - (rect.width / 2);
            } else if (popoverState.menuDisplay !== 'dial') {
                // Finger/Gesture Mode for list menus:
                // Position the bottom of the menu above the finger (y coordinate is where finger is).
                // The x and y coming in are the finger position, so we place the menu so its
                // bottom edge is at finger Y, and it's horizontally centered on the finger.
                top = popoverState.y - rect.height - 8;
                left = popoverState.x - rect.width / 2;
            }
            // Always clamp to screen bounds
            if (top < 10) top = 10;
            if (top + rect.height > winH - 10) top = Math.max(10, winH - rect.height - 10);
            if (left < 10) left = 10;
            if (left + rect.width > winW - 10) left = Math.max(10, winW - rect.width - 10);
            el.style.top = `${top}px`; el.style.left = `${left}px`;
        }
    }, [popoverState, popoverRef]);

    const lastHoveredIndex = React.useRef<number | null>(null);

    React.useEffect(() => {
        if (!popoverState || popoverState.menuDisplay === 'dial') return;

        const handlePointerMove = (e: PointerEvent) => {
            const items = document.querySelectorAll('.popover-item[data-menu-item="true"]');
            if (items.length === 0) return;

            let targetIndex = -1;

            if (popoverState.initialPointerX !== undefined && popoverState.initialPointerY !== undefined) {
                // Remote Control Mode: Radial Selection for Lists
                const dx = e.clientX - popoverState.initialPointerX;
                const dy = e.clientY - popoverState.initialPointerY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 20) {
                    let angle = Math.atan2(dy, dx) * 180 / Math.PI;
                    if (angle < 0) angle += 360;

                    // Map 0-360 to list items. Offset by 90 so 270 (Top) is index 0.
                    let normalizedAngle = (angle + 90) % 360;
                    targetIndex = Math.floor((normalizedAngle / 360) * items.length);
                }
            } else {
                // Classic Mode: Direct Hover
                const elements = document.elementsFromPoint(e.clientX, e.clientY);
                const menuItem = elements.find(el => (el as HTMLElement).getAttribute('data-menu-item') === 'true') as HTMLElement;
                if (menuItem) {
                    targetIndex = Array.from(items).indexOf(menuItem);
                }
            }

            // Haptic feedback logic
            if (targetIndex !== -1 && targetIndex !== lastHoveredIndex.current) {
                triggerHaptic(10);
                lastHoveredIndex.current = targetIndex;
            } else if (targetIndex === -1) {
                lastHoveredIndex.current = null;
            }

            // Apply highlighting
            items.forEach((item, idx) => {
                if (idx === targetIndex) {
                    item.classList.add('active-drag');
                } else {
                    item.classList.remove('active-drag');
                }
            });
        };

        const handlePointerUp = (e: PointerEvent) => {
            const activeItem = document.querySelector('.popover-item[data-menu-item="true"].active-drag') as HTMLElement;
            if (activeItem) {
                activeItem.click();
                // After executing, close the menu
                setPopoverState(null);
            }
            // Do NOT auto-close here — list menus should persist after the gesture ends.
            // The click-outside handler in ModalsLayer handles dismissal.
        };

        window.addEventListener('pointermove', handlePointerMove, { passive: true });
        window.addEventListener('pointerup', handlePointerUp, { passive: true });

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [popoverState, triggerHaptic, setPopoverState]);

    if (!popoverState) return null;

    if (popoverState.menuDisplay === 'dial') {
        return (
            <DialMenu
                setId={popoverState.setId}
                initialX={popoverState.initialPointerX ?? popoverState.x}
                initialY={popoverState.initialPointerY ?? popoverState.y}
                buttons={buttons}
                onClose={() => setPopoverState(null)}
                onExecute={(btn, e) => {
                    if (popoverState.assignSourceId) {
                        const isExecute = popoverState.executeAndAssign;
                        const dir = popoverState.assignSwipeDir;
                        setButtons((prev: CustomButton[]) => prev.map(b => b.id === popoverState.assignSourceId ? (dir ? { ...b, swipeCommands: { ...b.swipeCommands, [dir]: btn.command }, swipeActionTypes: { ...b.swipeActionTypes, [dir]: btn.actionType || 'command' } } : { ...b, command: btn.command, label: btn.label, actionType: btn.actionType || 'command' }) : b));
                        if (isExecute) handleButtonClick(btn, e as any, popoverState.context);
                        setPopoverState(null);
                        addMessage('system', `${isExecute ? 'Executed and assigned' : 'Assigned'} '${btn.label}'${dir ? ` to swipe ${dir}` : ''}.`);
                    } else {
                        handleButtonClick(btn, e as any, popoverState.context);
                    }
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
