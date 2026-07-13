import React, { useLayoutEffect } from 'react';
import { CharacterInfo, CustomButton, CustomTraitConfig, PopoverState, TeleportTarget, DrawerLine } from '../../types';

interface PopoverManagerProps {
    popoverState: PopoverState | null;
    setPopoverState: (state: PopoverState | null) => void;
    popoverRef: React.RefObject<HTMLDivElement>;
    buttons: CustomButton[];
    setButtons: (val: CustomButton[] | ((prev: CustomButton[]) => CustomButton[])) => void;
    availableSets: string[];
    executeCommand: (cmd: string, echo?: boolean) => void;
    addMessage: (...args: any[]) => void;
    setTarget: (target: string | null) => void;
    teleportTargets: TeleportTarget[];
    setTeleportTargets: (val: TeleportTarget[] | ((prev: TeleportTarget[]) => TeleportTarget[])) => void;
    handleButtonClick: (btn: CustomButton, e: React.MouseEvent, context?: string, isContainer?: boolean, parentNoun?: string, direction?: string) => void;
    triggerHaptic: (ms: number) => void;
    roomPlayers: string[];
    roomNpcs: string[];
    roomItems: string[];
    inventoryLines: DrawerLine[];
    eqLines: DrawerLine[];
    setSettings: Record<string, any>;
    inlineCategories: any[];
    setInlineCategories: React.Dispatch<React.SetStateAction<any[]>>;
    customTraits: CustomTraitConfig[];
    setCustomTraits: (val: CustomTraitConfig[] | ((prev: CustomTraitConfig[]) => CustomTraitConfig[])) => void;
    favorites: string[];
    setFavorites: React.Dispatch<React.SetStateAction<string[]>>;
    parley: any;
    setParley: (val: any) => void;
    whoList: any[];
    isMendingMode?: boolean;
    setIsMendingMode?: (val: boolean) => void;
    setMendingTarget?: (val: string | null) => void;
    handleTabClick: (drawer: 'character' | 'players' | 'equipment') => void;
    setGearTab: (tab: 'worn' | 'inv' | 'vicinity') => void;
    setPlayersTab: (tab: 'online' | 'nearby' | 'group') => void;
    setCharTab: (tab: 'info' | 'quests' | 'skills') => void;
    refreshLogHighlights: () => void;
    practice: any;
    openKeywordEdit: (context: string, displayText: string) => void;
    entities: any;
    registerEntity: (id: string, name: string, location: import('../../types').EntityLocation, category?: string) => import('../../types').GameEntity;
    selectedObjectIds: Set<string>;
    clearObjectSelection: () => void;
    keywordOverrides: Record<string, string>;
    accountCharacters?: any[];
    accountState?: any;
    setAccountState?: (val: any) => void;
    playerColor?: string;
    npcColor?: string;
    objectColor?: string;
    roomColor?: string;
    characterInfo?: CharacterInfo;
    currentTerrain?: string;
}
import { DialMenu } from './DialMenu';
import { StandardMenuPopover } from './StandardMenuPopover';
import { RecipientSelectPopover } from './RecipientSelectPopover';
import { TeleportSavePopover, TeleportSelectPopover, TeleportManagePopover } from './TeleportPopovers';
import { ContainerPopover } from './ContainerPopover';
import { ContainerSelectPopover } from './ContainerSelectPopover';
import { HelpCard } from '../Utility/HelpCard';
import { getButtonIdsForTraits, getInlineGlowColor, getResolvedTraitSections, toCategoryId } from '../../utils/inlineActionModel';
import { getInlineCategoryLabel, normalizeInlineCategoryId } from '../../utils/inlineCategoryAxes';
import { isButtonValidForEntity } from '../../utils/actionUtils';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { audioManager } from '../../services/audio/AudioManager';

const formatDialCategoryLabel = (category?: string | null): string => {
    if (!category) return '';
    return getInlineCategoryLabel(category).toUpperCase();
};

export const PopoverManager: React.FC<PopoverManagerProps> = ({
    popoverState: parentPopoverState, setPopoverState, popoverRef, setButtons, addMessage, triggerHaptic, handleButtonClick, executeCommand, setTarget, buttons, availableSets, teleportTargets, setTeleportTargets, roomPlayers, roomNpcs, roomItems, inventoryLines, eqLines, setSettings, inlineCategories, setInlineCategories, customTraits, setCustomTraits, favorites, setFavorites, parley, setParley, whoList,
    isMendingMode, setIsMendingMode, setMendingTarget, handleTabClick, setGearTab, setPlayersTab, setCharTab, refreshLogHighlights, practice, openKeywordEdit,
    entities, registerEntity, selectedObjectIds, clearObjectSelection, keywordOverrides, accountCharacters, accountState, setAccountState,
    playerColor, npcColor, objectColor, roomColor, characterInfo, currentTerrain
}) => {
    const theme = useSettingsStore(state => state.theme);
    const [localState, setLocalState] = React.useState<any | null>(null);
    const [isClosing, setIsClosing] = React.useState(false);
    const lastAudiblePopoverKeyRef = React.useRef<string | null>(null);

    React.useEffect(() => {
        if (parentPopoverState) {
            setLocalState(parentPopoverState);
            setIsClosing(false);
            const isPreparing = !!(parentPopoverState.openedByHover && (parentPopoverState.isCapturingExamine || parentPopoverState.isCapturingConsider));
            const popoverKey = [
                parentPopoverState.type || 'menu',
                parentPopoverState.entityId || '',
                parentPopoverState.setId || '',
                parentPopoverState.context || ''
            ].join(':');
            if (!isPreparing && lastAudiblePopoverKeyRef.current !== popoverKey) {
                audioManager.playEffect('actionmenu');
                lastAudiblePopoverKeyRef.current = popoverKey;
            }
        } else if (localState) {
            setIsClosing(true);
            lastAudiblePopoverKeyRef.current = null;
            const timer = setTimeout(() => {
                setLocalState(null);
                setIsClosing(false);
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [parentPopoverState]);

    const popoverState = localState;
    useLayoutEffect(() => {
        document.querySelectorAll('.inline-btn.menu-active').forEach(el => el.classList.remove('menu-active'));
        const entityId = popoverState?.entityId;
        if (!entityId) return undefined;

        const leaf = entityId.split(':').pop() || entityId;
        document.querySelectorAll<HTMLElement>('.inline-btn[data-id]').forEach(el => {
            const id = el.getAttribute('data-id') || '';
            const idLeaf = id.split(':').pop() || id;
            const matches =
                id === entityId ||
                id === leaf ||
                idLeaf === leaf ||
                id.endsWith(':' + entityId) ||
                entityId.endsWith(':' + id);
            if (matches) el.classList.add('menu-active');
        });

        return () => {
            document.querySelectorAll('.inline-btn.menu-active').forEach(el => el.classList.remove('menu-active'));
        };
    }, [popoverState?.entityId]);

    useLayoutEffect(() => {
        if (popoverState && popoverState.type !== 'help-card' && popoverRef.current) {
            const el = popoverRef.current;

            const positionPopover = () => {
                const winH = window.innerHeight, winW = window.innerWidth;
                el.style.maxHeight = '';
                // Measure with offset* (layout box) rather than getBoundingClientRect,
                // whose width/height are distorted by the scale() bounce-in animation.
                const compactRoot = el.querySelector('.inline-action-compact') as HTMLElement | null;
                const popW = compactRoot?.offsetWidth || el.offsetWidth;
                const popH = el.offsetHeight;
                if (compactRoot) el.style.width = `${popW}px`;
                let top = popoverState.y, left = popoverState.x;

                if (popoverState.type === 'select-parley-target' || popoverState.type === 'select-parley-command') {
                    left = popoverState.x - (popW / 2);
                    el.style.bottom = `${winH - popoverState.y + 8}px`;
                    el.style.top = 'auto';
                    el.style.transformOrigin = 'center bottom';
                } else {
                    el.style.bottom = 'auto';
                    el.style.top = 'auto';
                    delete el.dataset.anchorPlacement;
                    if (popoverState.menuDisplay !== 'dial' && popoverState.sourceRect) {
                        const source = popoverState.sourceRect;
                        const gap = 8;
                        const sourceBottom = source.top + source.height;
                        const sideSpace = winW - (source.left + source.width) - gap;
                        const canFitRight = sideSpace >= popW;
                        const canFitLeft = source.left - gap >= popW;
                        if (popoverState.preferSide === 'right' && (canFitRight || canFitLeft)) {
                            left = canFitRight ? source.left + source.width + gap : source.left - popW - gap;
                            top = source.top + (source.height / 2) - (popH / 2);
                            if (top < 10) top = 10;
                            if (top + popH > winH - 10) top = Math.max(10, winH - popH - 10);
                            el.style.top = `${top}px`;
                            el.style.transformOrigin = canFitRight ? 'left center' : 'right center';
                            el.dataset.anchorPlacement = canFitRight ? 'right' : 'left';
                        } else {
                            left = compactRoot
                                ? source.left
                                : source.left + (source.width / 2) - (popW / 2);
                            const spaceAbove = source.top - gap - 10;
                            const spaceBelow = winH - sourceBottom - gap - 10;
                            const placeAbove = popH <= spaceAbove || (popH > spaceBelow && spaceAbove >= spaceBelow);
                            if (placeAbove) {
                                // Anchor the bottom edge just above the button: the popover
                                // never overlaps it, and stays put as async content (e.g.
                                // captured examine/consider lines) grows it upward.
                                el.style.bottom = `${Math.max(10, winH - (source.top - gap))}px`;
                                el.style.transformOrigin = 'center bottom';
                                el.dataset.anchorPlacement = 'above';
                            } else {
                                el.style.top = `${Math.min(sourceBottom + gap, Math.max(10, winH - popH - 10))}px`;
                                el.dataset.anchorPlacement = 'below';
                                el.style.transformOrigin = 'center top';
                            }
                        }
                    } else if (popoverState.menuDisplay !== 'dial') {
                        const rootStyles = getComputedStyle(document.documentElement);
                        const centerX = parseFloat(rootStyles.getPropertyValue('--wheel-center-x')) || (winW / 2);
                        const centerY = parseFloat(rootStyles.getPropertyValue('--wheel-center-y')) || (winH / 2);
                        top = centerY - (popH / 2);
                        left = centerX - (popW / 2);
                        if (top < 10) top = 10;
                        if (top + popH > winH - 10) top = Math.max(10, winH - popH - 10);
                        el.style.top = `${top}px`;
                    }
                }

                if (left < 10) left = 10;
                if (left + popW > winW - 10) left = Math.max(10, winW - popW - 10);
                el.style.left = `${left}px`;
            };

            positionPopover();
            const frame = requestAnimationFrame(positionPopover);
            const observer = new ResizeObserver(positionPopover);
            observer.observe(el);
            window.addEventListener('resize', positionPopover);
            return () => {
                cancelAnimationFrame(frame);
                observer.disconnect();
                window.removeEventListener('resize', positionPopover);
            };
        }
        return undefined;
    }, [popoverState, popoverRef]);

    const lastHoveredIndex = React.useRef<number | null>(null);
    const scrollIntervalRef = React.useRef<number | null>(null);

    React.useEffect(() => {
        if (!popoverState || popoverState.menuDisplay === 'dial' || popoverState.type === 'help-card') return;

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
    console.log('[PopoverManager] Current state:', { type: popoverState.type, setId: popoverState.setId, context: popoverState.context, direction: popoverState.direction });

    const detectedCatId = normalizeInlineCategoryId(popoverState.category || popoverState.setId);
    const themeColor = getInlineGlowColor(
        detectedCatId,
        inlineCategories || [],
        {
            player: playerColor || undefined,
            all:    playerColor || undefined,
            npc:    npcColor   || undefined,
            object: objectColor || undefined,
            room:   roomColor  || undefined,
        },
        theme
    ) || popoverState.accentColor || undefined;

    if (popoverState.menuDisplay === 'dial') {
        const categorySet = toCategoryId(detectedCatId) || detectedCatId;
        const traitSections = getResolvedTraitSections(
            categorySet || popoverState.setId,
            popoverState.context || null,
            inlineCategories || []
        );
        const actionButtonIds = getButtonIdsForTraits(traitSections.map(section => section.trait));
        const filterDeps = { buttons, inlineCategories: inlineCategories || [], roomNpcs, entities, characterInfo, currentTerrain };
        const filteredActionButtonIds = actionButtonIds.filter(id => {
            const button = buttons.find(item => item.id === id);
            return !!button && isButtonValidForEntity(
                button,
                popoverState.entityId || '',
                categorySet || popoverState.setId,
                filterDeps,
                popoverState.setId,
                popoverState.context
            );
        });
        const setIdsChain = Array.from(new Set([
            popoverState.setId,
            categorySet
        ].filter(Boolean) as string[]));
        
        return (
            <DialMenu
                setId={setIdsChain}
                actionButtonIds={filteredActionButtonIds}
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
                        handleButtonClick(btn, e as any, popoverState.context, undefined, undefined, popoverState.direction);
                    }
                }}
                triggerHaptic={triggerHaptic}
                themeColor={themeColor}
                instruction={popoverState.executeAndAssign ? 'fire and remap' : 'select to fire'}
                targetName={popoverState.context}
                categoryLabel={formatDialCategoryLabel(categorySet)}
                onHelp={popoverState.context ? () => {
                    triggerHaptic?.(20);
                    executeCommand(`help ${popoverState.context}`, false);
                    setPopoverState(null);
                } : undefined}
                onTag={() => {
                    triggerHaptic?.(20);
                    setPopoverState({
                        ...popoverState,
                        menuDisplay: 'list',
                        type: 'menu',
                        initialPointerX: undefined,
                        initialPointerY: undefined,
                        isChoosingCategory: true
                    });
                }}
            />
        );
    }

    if (popoverState.type === 'help-card' && popoverState.helpData) {
        return (
            <HelpCard 
                helpData={popoverState.helpData}
                onClose={() => setPopoverState(null)}
                popoverRef={popoverRef}
                executeCommand={executeCommand}
                triggerHaptic={triggerHaptic}
            />
        );
    }

    const hasCapturedDetails = !!(popoverState.isCapturingExamine || popoverState.isCapturingConsider || popoverState.capturedExamineLines || popoverState.capturedConsiderLines);
    const isParleyType = popoverState.type === 'select-parley-command' || popoverState.type === 'select-parley-target';
    const isAnchoredDropdown = !!popoverState.sourceRect && !isParleyType && popoverState.type !== 'menu' && popoverState.type !== undefined;
    return (
        <div className={`popover-menu${isParleyType ? ' parley-dropdown' : ''}${isAnchoredDropdown ? ' inline-dropdown' : ''}${isClosing ? ' closing' : ''}${hasCapturedDetails ? ' popover-captured-wide' : ''}`} ref={popoverRef} style={{
            position: 'fixed',
            left: popoverState.x,
            top: popoverState.y,
            zIndex: 70000,
            '--accent': themeColor || 'var(--set-accent, var(--accent))'
        } as any}>
            {popoverState.type === 'teleport-save' && <TeleportSavePopover popoverState={popoverState} setPopoverState={setPopoverState} setTeleportTargets={setTeleportTargets} addMessage={addMessage} />}
            {popoverState.type === 'teleport-select' && <TeleportSelectPopover popoverState={popoverState} setPopoverState={setPopoverState} teleportTargets={teleportTargets} executeCommand={executeCommand} />}
            {popoverState.type === 'teleport-manage' && <TeleportManagePopover teleportTargets={teleportTargets} setTeleportTargets={setTeleportTargets} setPopoverState={setPopoverState} />}
            {popoverState.type === 'give-recipient-select' && <RecipientSelectPopover popoverState={popoverState} roomPlayers={roomPlayers} roomNpcs={roomNpcs} executeCommand={executeCommand} setPopoverState={setPopoverState} themeColor={themeColor} />}
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
                    customTraits={customTraits}
                    setCustomTraits={setCustomTraits}
                    isMendingMode={isMendingMode}
                    setIsMendingMode={setIsMendingMode}
                    setMendingTarget={setMendingTarget}
                    handleTabClick={handleTabClick}
                    setGearTab={setGearTab}
                    setPlayersTab={setPlayersTab}
                    setCharTab={setCharTab}
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
                    accountCharacters={accountCharacters}
                    accountState={accountState}
                    setAccountState={setAccountState}
                    characterInfo={characterInfo}
                    direction={popoverState.direction}
                    currentTerrain={currentTerrain}
                />            )}
        </div>
    );
};
