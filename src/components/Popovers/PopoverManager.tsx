import React, { useLayoutEffect } from 'react';
import { PopoverManagerProps, CustomButton } from '../../types';
import { DialMenu } from './DialMenu';
import { StandardMenuPopover } from './StandardMenuPopover';
import { RecipientSelectPopover } from './RecipientSelectPopover';
import { TeleportSavePopover, TeleportSelectPopover, TeleportManagePopover } from './TeleportPopovers';
import ShopSearchPopover from './ShopSearchPopover';
import { ContainerPopover } from './ContainerPopover';
import { ContainerSelectPopover } from './ContainerSelectPopover';
import { FloatingGroupCard } from '../FloatingGroupCard';
import { getHierarchyChain } from '../../utils/buttonHierarchyUtils';
import { getCategoryForName, getGlowColorForCategory } from '../../utils/categorizationUtils';

export const PopoverManager: React.FC<PopoverManagerProps> = ({
    popoverState, setPopoverState, popoverRef, setButtons, addMessage, triggerHaptic, handleButtonClick, executeCommand, setTarget, buttons, availableSets, teleportTargets, setTeleportTargets, roomPlayers, roomNpcs, roomItems, inventoryLines, eqLines, setSettings, inlineCategories, setInlineCategories, favorites, setFavorites, parley, setParley, whoList,
    isMendingMode, setIsMendingMode, setMendingTarget, setIsEquipmentOpen, setIsInventoryOpen, refreshLogHighlights, practice, shop, openKeywordEdit,
    entities, registerEntity, selectedObjectIds, clearObjectSelection, keywordOverrides
}) => {

    useLayoutEffect(() => {
        if (popoverState && popoverRef.current) {
            const el = popoverRef.current;
            const rect = el.getBoundingClientRect();
            const winH = window.innerHeight, winW = window.innerWidth;
            let top = popoverState.y, left = popoverState.x;

            if (popoverState.initialPointerX !== undefined) {
                top = (winH / 2) - (rect.height / 2);
                left = (winW / 2) - (rect.width / 2);
            } else if (popoverState.menuDisplay !== 'dial') {
                top = popoverState.y - rect.height - 8;
                left = popoverState.x - rect.width / 2;
            }
            if (top < 10) top = 10;
            if (top + rect.height > winH - 10) top = Math.max(10, winH - rect.height - 10);
            if (left < 10) left = 10;
            if (left + rect.width > winW - 10) left = Math.max(10, winW - rect.width - 10);
            el.style.top = `${top}px`; el.style.left = `${left}px`;
        }
    }, [popoverState, popoverRef]);

    const lastHoveredIndex = React.useRef<number | null>(null);
    const scrollIntervalRef = React.useRef<number | null>(null);

    React.useEffect(() => {
        if (!popoverState || popoverState.menuDisplay === 'dial') return;

        const handlePointerMove = (e: PointerEvent) => {
            const menuContainer = document.querySelector('.popover-menu') as HTMLElement;
            if (!menuContainer) return;

            // Ensure we keep receiving events even if finger leaves the menu bounds
            if (e.target && 'setPointerCapture' in e.target) {
                try { (e.target as any).setPointerCapture(e.pointerId); } catch (e) { }
            }

            const items = Array.from(menuContainer.querySelectorAll('.popover-item[data-menu-item="true"]')) as HTMLElement[];
            if (items.length === 0) return;

            const menuRect = menuContainer.getBoundingClientRect();
            let targetIndex = -1;

            // Precision bounding box check for every item
            for (let i = 0; i < items.length; i++) {
                const rect = items[i].getBoundingClientRect();
                if (e.clientY >= rect.top && e.clientY <= rect.bottom &&
                    e.clientX >= rect.left - 40 && e.clientX <= rect.right + 40) {
                    targetIndex = i;
                    break;
                }
            }

            // Edge cases: if finger is totally outside but we want to stick to top/bottom for scrolling
            if (targetIndex === -1 && e.clientX >= menuRect.left - 60 && e.clientX <= menuRect.right + 60) {
                if (e.clientY <= menuRect.top + 10) targetIndex = 0;
                else if (e.clientY >= menuRect.bottom - 10) targetIndex = items.length - 1;
            }

            // Continuous scrolling logic
            if (scrollIntervalRef.current) {
                cancelAnimationFrame(scrollIntervalRef.current);
                scrollIntervalRef.current = null;
            }

            const scrollThreshold = 60;
            const maxScrollSpeed = 15;

            if (e.clientY > menuRect.bottom - scrollThreshold || e.clientY < menuRect.top + scrollThreshold) {
                const startScroll = () => {
                    const rect = menuContainer.getBoundingClientRect();
                    if (!rect) return;

                    let speed = 0;
                    if (e.clientY > rect.bottom - scrollThreshold) {
                        const ratio = Math.min(1, (e.clientY - (rect.bottom - scrollThreshold)) / scrollThreshold);
                        speed = ratio * maxScrollSpeed;
                    } else if (e.clientY < rect.top + scrollThreshold) {
                        const ratio = Math.min(1, ((rect.top + scrollThreshold) - e.clientY) / scrollThreshold);
                        speed = -ratio * maxScrollSpeed;
                    }

                    if (speed !== 0) {
                        menuContainer.scrollTop += speed;
                        scrollIntervalRef.current = requestAnimationFrame(startScroll);
                    }
                };
                scrollIntervalRef.current = requestAnimationFrame(startScroll);
            }

            // Haptic and highlighting
            if (targetIndex !== -1 && targetIndex !== lastHoveredIndex.current) {
                triggerHaptic(10);
                lastHoveredIndex.current = targetIndex;
            } else if (targetIndex === -1) {
                lastHoveredIndex.current = null;
            }

            items.forEach((item, idx) => {
                if (idx === targetIndex) item.classList.add('active-drag');
                else item.classList.remove('active-drag');
            });
        };

        const handlePointerUp = (e: PointerEvent) => {
            if ((window as any).popoverIsClosing) {
                console.log('[DEBUG] PopoverManager ignoring pointerup (menu is closing)');
                return;
            }

            if (scrollIntervalRef.current) {
                cancelAnimationFrame(scrollIntervalRef.current);
                scrollIntervalRef.current = null;
            }

            const activeItem = document.querySelector('.popover-item[data-menu-item="true"].active-drag') as HTMLElement;
            if (activeItem) {
                // Check if the current pointer position is over a favorite star
                const hitEl = document.elementFromPoint(e.clientX, e.clientY);
                // elementFromPoint typically returns Elements, but we use safe closest just in case
                const star = hitEl?.closest ? hitEl.closest('.favorite-star') : hitEl?.parentElement?.closest('.favorite-star');
                
                console.log('[DEBUG] PopoverManager PointerUp:', {
                    x: e.clientX,
                    y: e.clientY,
                    hitEl: hitEl?.className,
                    star: !!star
                });

                if (star) {
                    (star as HTMLElement).click();
                } else {
                    const isMenu = activeItem.getAttribute('data-is-menu') === 'true';
                    activeItem.click();
                    if (!isMenu) setPopoverState(null);
                }
            }

            // Clean up capture
            if (e.target && 'releasePointerCapture' in e.target) {
                try { (e.target as any).releasePointerCapture(e.pointerId); } catch (e) { }
            }
        };

        // Use capture phase to ensure we see events even if children try to stop them
        window.addEventListener('pointermove', handlePointerMove, { capture: true, passive: false });
        window.addEventListener('pointerup', handlePointerUp, { capture: true, passive: true });

        return () => {
            window.removeEventListener('pointermove', handlePointerMove, { capture: true });
            window.removeEventListener('pointerup', handlePointerUp, { capture: true });
            if (scrollIntervalRef.current) cancelAnimationFrame(scrollIntervalRef.current);
            
            // Clean up any persistent highlights from log items
            document.querySelectorAll('.inline-btn.menu-active').forEach(el => el.classList.remove('menu-active'));
        };
    }, [popoverState, triggerHaptic, setPopoverState]);

    if (!popoverState) return null;
    console.log('[PopoverManager] Current state:', { type: popoverState.type, setId: popoverState.setId, context: popoverState.context });

    // Resolve theme color for this menu
    let themeColor = setSettings[popoverState.setId]?.themeColor || popoverState.accentColor;
    if (!themeColor) {
        if (popoverState.setId === 'inlineplayer') themeColor = 'rgb(150, 150, 255)';
        else if (popoverState.setId?.startsWith('inline-') || popoverState.setId === 'inlinenpc') {
            themeColor = getGlowColorForCategory(popoverState.category || popoverState.setId, inlineCategories || []) || undefined;
        }
    }

    if (popoverState.menuDisplay === 'dial') {
        const detectedCatId = popoverState.category || (popoverState.context ? getCategoryForName(popoverState.context, inlineCategories || []) : null);
        const setIdsChain = getHierarchyChain(popoverState.setId, detectedCatId);
        
        return (
            <DialMenu
                setId={setIdsChain}
                initialX={popoverState.initialPointerX ?? popoverState.x}
                initialY={popoverState.initialPointerY ?? popoverState.y}
                buttons={buttons}
                onClose={() => setPopoverState(null)}
                onExecute={(btn, e) => {
                    if (popoverState.assignSourceId) {
                        const isExecute = popoverState.executeAndAssign;
                        const dir = popoverState.assignSwipeDir;
                        setButtons((prev: CustomButton[]) => prev.map(b => b.id === popoverState.assignSourceId ? (dir ? { 
                            ...b, 
                            swipeCommands: { ...(b.swipeCommands || {}), [dir]: btn.command }, 
                            swipeActionTypes: { ...(b.swipeActionTypes || {}), [dir]: btn.actionType || 'command' } 
                        } : { ...b, command: btn.command, label: btn.label, actionType: btn.actionType || 'command' }) : b));
                        if (isExecute) handleButtonClick(btn, e as any, popoverState.context);
                        setPopoverState(null);
                        addMessage('system', `${isExecute ? 'Executed and assigned' : 'Assigned'} '${btn.label}'${dir ? ` to swipe ${dir}` : ''}.`);
                    } else {
                        handleButtonClick(btn, e as any, popoverState.context);
                    }
                }}
                triggerHaptic={triggerHaptic}
                themeColor={themeColor}
                instruction={popoverState.executeAndAssign ? 'fire and remap' : 'select to fire'}
            />
        );
    }

    if (popoverState.type === 'shop-card' || popoverState.type === 'practice-card') {
        const isPractice = popoverState.type === 'practice-card';
        return (
            <FloatingGroupCard
                type={isPractice ? 'practice' : 'shop'}
                shopItems={popoverState.shopItems}
                practiceData={isPractice ? (practice?.practiceData || popoverState.practiceData) : undefined}
                onClose={() => setPopoverState(null)}
                executeCommand={executeCommand}
                practice={practice}
                shop={shop}
                setPopoverState={setPopoverState}
                popoverRef={popoverRef}
            />
        );
    }

    return (
        <div className={`popover-menu ${popoverState.type === 'shop-search' ? 'shop-search-active' : ''}`} ref={popoverRef} style={{
            position: 'fixed',
            left: popoverState.x,
            top: popoverState.y,
            zIndex: 25000,
            '--accent': themeColor || 'var(--set-accent, var(--accent))'
        } as any}>
            {popoverState.type === 'teleport-save' && <TeleportSavePopover popoverState={popoverState} setPopoverState={setPopoverState} setTeleportTargets={setTeleportTargets} addMessage={addMessage} />}
            {popoverState.type === 'teleport-select' && <TeleportSelectPopover popoverState={popoverState} setPopoverState={setPopoverState} teleportTargets={teleportTargets} executeCommand={executeCommand} />}
            {popoverState.type === 'teleport-manage' && <TeleportManagePopover teleportTargets={teleportTargets} setTeleportTargets={setTeleportTargets} setPopoverState={setPopoverState} />}
            {popoverState.type === 'give-recipient-select' && <RecipientSelectPopover popoverState={popoverState} roomPlayers={roomPlayers} roomNpcs={roomNpcs} executeCommand={executeCommand} setPopoverState={setPopoverState} themeColor={themeColor} />}
            {popoverState.type === 'shop-search' && <ShopSearchPopover executeCommand={executeCommand} onClose={() => setPopoverState(null)} />}
            {popoverState.type === 'container' && (
                <ContainerPopover 
                    popoverState={popoverState} 
                    setPopoverState={setPopoverState} 
                    handleButtonClick={handleButtonClick} 
                    addMessage={addMessage} 
                    themeColor={themeColor} 
                />
            )}
            {popoverState.type === 'put-container-select' && (
                <ContainerSelectPopover
                    popoverState={popoverState}
                    roomItems={roomItems}
                    inventoryLines={inventoryLines || []}
                    eqLines={eqLines || []}
                    entities={entities}
                    executeCommand={executeCommand}
                    setPopoverState={setPopoverState}
                    themeColor={themeColor}
                />
            )}
            {(popoverState.type === 'select-parley-command' || popoverState.type === 'select-parley-target' || popoverState.type === 'give-target-select' || popoverState.type === 'menu' || !popoverState.type) && (
                <StandardMenuPopover
                    popoverState={popoverState}
                    buttons={buttons}
                    availableSets={availableSets}
                    setPopoverState={setPopoverState}
                    setButtons={setButtons}
                    handleButtonClick={handleButtonClick}
                    setTarget={setTarget}
                    addMessage={addMessage}
                    themeColor={themeColor}
                    favorites={favorites}
                    setFavorites={setFavorites}
                    parley={parley}
                    setParley={setParley}
                    whoList={whoList}
                    executeCommand={executeCommand}
                    inlineCategories={inlineCategories}
                    setInlineCategories={setInlineCategories}
                    isMendingMode={isMendingMode}
                    setIsMendingMode={setIsMendingMode}
                    setMendingTarget={setMendingTarget}
                    setIsEquipmentOpen={setIsEquipmentOpen}
                    setIsInventoryOpen={setIsInventoryOpen}
                    refreshLogHighlights={refreshLogHighlights}
                    triggerHaptic={triggerHaptic}
                    openKeywordEdit={openKeywordEdit}
                    roomPlayers={roomPlayers}
                    roomNpcs={roomNpcs}
                    roomItems={roomItems}
                    entities={entities}
                    registerEntity={registerEntity}
                    selectedObjectIds={selectedObjectIds}
                    clearObjectSelection={clearObjectSelection}
                    keywordOverrides={keywordOverrides}
                />            )}
        </div>
    );
};
