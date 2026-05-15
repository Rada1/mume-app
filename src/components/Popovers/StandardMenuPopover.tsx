/**
 * @file StandardMenuPopover.tsx
 * @description Main orchestrator for entity and action popovers.
 */

import React from 'react';
import { CustomButton, MessageType, PopoverState, InlineCategoryConfig, GameEntity, ParleyState, GmcpOccupant, CharacterEntry, CustomTraitConfig } from '../../types';
import { isButtonValidForEntity } from '../../utils/actionUtils';
import { getButtonIdsForTraits, getCategoryConfig, getResolvedTraitSections, getTraitsForName as getInlineActionTraits } from '../../utils/inlineActionModel';
import { getInlineCategoryAxes, getInlineCategoryLabel, normalizeInlineCategoryId } from '../../utils/inlineCategoryAxes';
import { formatMumeTarget } from '../../utils/gameUtils';

// --- Sub-components ---
import { TraitToggleSection } from './StandardMenu/TraitToggleSection';
import { PopoverActionButton } from './StandardMenu/PopoverActionButton';
import { ParleySection } from './StandardMenu/ParleySection';

interface StandardMenuProps {
    popoverState: PopoverState;
    buttons: CustomButton[];
    availableSets: string[];
    setPopoverState: React.Dispatch<React.SetStateAction<PopoverState | null>>;
    setButtons: React.Dispatch<React.SetStateAction<CustomButton[]>>;
    handleButtonClick: (button: CustomButton, e: any, context?: string, isContainer?: boolean, parentNoun?: string, direction?: string) => void;
    setTarget: (target: string | null) => void;
    addMessage: (type: MessageType, content: string) => void;
    themeColor?: string;
    favorites: string[];
    setFavorites: (val: string[] | ((prev: string[]) => string[])) => void;
    keywordOverrides?: Record<string, string>;
    parley: ParleyState;
    setParley: (val: ParleyState) => void;
    whoList: string[];
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean, options?: { shouldFocus?: boolean, fromUi?: boolean }) => void;
    inlineCategories?: InlineCategoryConfig[];
    customTraits?: CustomTraitConfig[];
    setCustomTraits?: (val: CustomTraitConfig[] | ((prev: CustomTraitConfig[]) => CustomTraitConfig[])) => void;
    isMendingMode?: boolean;
    setIsMendingMode?: (val: boolean) => void;
    setMendingTarget?: (val: string | null) => void;
    handleTabClick: (drawer: 'character' | 'players' | 'equipment') => void;
    setGearTab: (tab: 'worn' | 'inv' | 'vicinity') => void;
    setPlayersTab: (tab: 'online' | 'nearby' | 'group') => void;
    setCharTab: (tab: 'info' | 'quests' | 'skills') => void;
    refreshLogHighlights?: () => void;
    triggerHaptic?: (ms: number) => void;
    openKeywordEdit?: (context: string, displayText: string) => void;
    roomPlayers?: (string | GmcpOccupant)[];
    roomNpcs?: (string | GmcpOccupant)[];
    roomItems?: any[];
    entities: Record<string, GameEntity>;
    registerEntity: (id: string, name: string, location: import('../../types').EntityLocation, category?: string) => import('../../types').GameEntity;
    selectedObjectIds: Set<string>;
    clearObjectSelection: () => void;
    accountCharacters?: CharacterEntry[];
    accountState?: import('../../types').AccountState;
    setAccountState?: React.Dispatch<React.SetStateAction<import('../../types').AccountState>>;
    direction?: string;
}

const NPC_SUBCATEGORIES = ['npc-mount', 'npc-shopkeeper', 'npc-innkeeper', 'npc-guildmaster'];

const formatSetLabel = (id: string): string => {
    const category = getCategoryConfig(id);
    if (category) return category.label;
    return id.replace(/^(inline|cat)-/, '').replace(/-/g, ' ').toUpperCase();
};

export const StandardMenuPopover: React.FC<StandardMenuProps> = (props) => {
    const {
        popoverState, buttons, availableSets, setPopoverState, setButtons, handleButtonClick, setTarget, addMessage, favorites,
        setFavorites, keywordOverrides, parley, setParley, whoList, executeCommand, inlineCategories, customTraits, setCustomTraits,
        handleTabClick, setGearTab, setPlayersTab, setCharTab,
        refreshLogHighlights, triggerHaptic, openKeywordEdit, roomNpcs,
        entities, selectedObjectIds, clearObjectSelection, accountState, setAccountState, direction,
        themeColor
    } = props;

    const [isChoosingCategory, setIsChoosingCategory] = React.useState(!!popoverState.isChoosingCategory);
    const menuRootRef = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        setIsChoosingCategory(!!popoverState.isChoosingCategory);
    }, [popoverState.isChoosingCategory, popoverState.context, popoverState.setId]);
    const safeSetId = popoverState.setId ?? '';
    const isSetManager = safeSetId === 'setmanager';
    
    const categoryId = normalizeInlineCategoryId(popoverState.category || safeSetId);
    const categoryAxes = getInlineCategoryAxes(categoryId);
    const resolvedTraitSections = getResolvedTraitSections(
        categoryId,
        popoverState.context || null,
        inlineCategories || []
    );
    const keywordTraitIds = popoverState.context
        ? getInlineActionTraits(popoverState.context, inlineCategories || []).map(trait => trait.id)
        : [];
    const resolvedTraitIds = resolvedTraitSections.map(section => section.trait.id);
    const resolvedTraitButtonIds = new Set(getButtonIdsForTraits(resolvedTraitSections.map(section => section.trait)));

    // Build action sections from resolved traits only.
    const entity = popoverState.entityId ? entities[popoverState.entityId] : null;
    const shouldUseEntityFilter = !!(popoverState.entityId && entity);
    const sectionDefs = React.useMemo(() => {
        const sections: Array<{ key: string; label: string; buttonIds: string[] }> = [];
        const seen = new Set<string>();

        resolvedTraitSections.forEach(section => {
            if (seen.has(section.trait.id)) return;
            seen.add(section.trait.id);
            sections.push({
                key: section.trait.id,
                label: section.trait.label,
                buttonIds: section.buttonIds
            });
        });

        return sections;
    }, [resolvedTraitSections]);
    const isTacticalSet = ['warriorskilllist', 'rangerskilllist', 'clericspelllist', 'thiefskilllist', 'magespelllist', 'doors'].includes(safeSetId);
    const targetContext = formatMumeTarget(popoverState.context) || popoverState.context || null;
    const toggleFavorite = (e: React.MouseEvent, command: string) => {
        e.stopPropagation();
        setFavorites(prev => prev.includes(command) ? prev.filter(id => id !== command) : [...prev, command]);
    };

    let seenCommandsSize = 0;
    const renderActionButtons = () => {
        const seenCommands = new Set<string>();
        const filterDeps = { buttons, inlineCategories: inlineCategories || [], roomNpcs, entities };

        const favoritedButtons = buttons.filter(b => {
            const isValid = isButtonValidForEntity(b, popoverState.entityId || '', categoryId, filterDeps, safeSetId, popoverState.context);
            if (!isValid) return false;
            return resolvedTraitButtonIds.has(b.id) && favorites.includes(b.command);
        });

        const rendered = (
            <>
                {isInlineMenu ? (
                    <>
                        {favoritedButtons.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', padding: '4px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ minWidth: '52px', fontSize: '0.58rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, color: '#ffd700', paddingTop: '5px', flexShrink: 0 }}>★ Favs</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', flex: 1 }}>
                                    {favoritedButtons.map(b => <PopoverActionButton key={b.id} button={b} {...props} toggleFavorite={toggleFavorite} compact />)}
                                </div>
                            </div>
                        )}
                        {sectionDefs.map((section) => {
                            const sectionButtons = buttons.filter(b => {
                                if (!section.buttonIds.includes(b.id) || favorites.includes(b.command) || seenCommands.has(b.command)) return false;
                                const isValid = isButtonValidForEntity(b, popoverState.entityId || '', categoryId, filterDeps, safeSetId, popoverState.context);
                                if (isValid) seenCommands.add(b.command);
                                return isValid;
                            });
                            if (sectionButtons.length === 0) return null;
                            return (
                                <div key={section.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', padding: '4px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    {section.label && (
                                        <div style={{ minWidth: '52px', fontSize: '0.58rem', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, color: 'var(--accent)', paddingTop: '5px', flexShrink: 0 }}>
                                            {section.label}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', flex: 1 }}>
                                        {sectionButtons.map(b => <PopoverActionButton key={b.id} button={b} {...props} toggleFavorite={toggleFavorite} handleTabClick={handleTabClick} setGearTab={setGearTab} compact />)}
                                    </div>
                                </div>
                            );
                        })}
                    </>
                ) : (
                    buttons.filter(b => b.setId === safeSetId && !favorites.includes(b.command)).map(b => {
                        seenCommands.add(b.command);
                        return <PopoverActionButton key={b.id} button={b} {...props} toggleFavorite={toggleFavorite} handleTabClick={handleTabClick} setGearTab={setGearTab} />;
                    })
                )}
            </>
        );

        seenCommandsSize = seenCommands.size + favoritedButtons.length;
        return rendered;
    };

    // --- Special Cases ---

    const isInlineMenu = !isTacticalSet && (
        categoryAxes.isInlineAction ||
        ['inventorylist', 'equipmentlist', 'roomitems', 'roomnpcs', 'selection'].includes(safeSetId) ||
        safeSetId.startsWith('object') ||
        safeSetId.startsWith('npc')
    );
    const isTargetable = !isTacticalSet && (categoryAxes.isTargetable || ['selection', 'inventorylist', 'equipmentlist', 'npc', 'player', 'object-corpse'].includes(safeSetId) || NPC_SUBCATEGORIES.includes(safeSetId));
    const headerContext = categoryAxes.isCharacter ? targetContext : popoverState.context;
    const categoryLabel = isSetManager ? '' : (() => {
        if (categoryAxes.isInlineAction) return getInlineCategoryLabel(categoryId);
        return safeSetId ? formatSetLabel(safeSetId) : '';
    })();

    return (
        <div ref={menuRootRef} style={{ '--accent': themeColor || 'var(--accent)', '--set-accent': themeColor || 'var(--accent)' } as any}>
            <div className="popover-header" onPointerDown={(e) => { e.stopPropagation(); }} style={{ cursor: !isSetManager ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))', marginBottom: '3px', paddingBottom: '3px', color: 'var(--accent)', fontWeight: 'bold' }} onClick={() => { triggerHaptic?.(20); if (!isSetManager) setPopoverState({ ...popoverState, setId: 'setmanager' }); }}>
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {isSetManager ? 'Main Menu' : ((selectedObjectIds?.size || 0) > 1 ? `${selectedObjectIds!.size} Items Selected` : (headerContext ? headerContext : (popoverState.direction ? `${formatSetLabel(safeSetId).toUpperCase()} (${popoverState.direction.toUpperCase()})` : formatSetLabel(safeSetId).toUpperCase())))}
                    </span>
                    <span style={{ fontSize: '0.6rem', opacity: 0.6, fontWeight: 'normal', marginTop: '1px' }}>{popoverState.executeAndAssign ? 'select action to fire and remap button' : categoryLabel}</span>
                </div>
                {!isSetManager && categoryAxes.isInlineAction && (
                    <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                        <div onClick={(e) => { e.stopPropagation(); setIsChoosingCategory(!isChoosingCategory); }} style={{ padding: '2px 6px', fontSize: '0.6rem', background: isChoosingCategory ? 'var(--accent)' : 'rgba(255,255,255,0.1)', color: isChoosingCategory ? '#000' : 'var(--accent)', borderRadius: '4px', cursor: 'pointer', height: '22px', display: 'flex', alignItems: 'center' }}>TRAIT</div>
                    </div>
                )}
            </div>

            {isChoosingCategory && setCustomTraits && (
                <TraitToggleSection popoverState={popoverState} customTraits={customTraits || []} setCustomTraits={setCustomTraits} activeTraits={resolvedTraitIds} keywordTraits={keywordTraitIds} triggerHaptic={triggerHaptic} addMessage={addMessage} refreshLogHighlights={refreshLogHighlights} />
            )}

            {isTargetable && !isChoosingCategory && (
                <div className="popover-item" data-menu-item="true" onPointerDown={(e) => { e.stopPropagation(); }} onClick={() => { triggerHaptic?.(20); setTarget(targetContext); setPopoverState(null); }} style={{ '--set-accent': themeColor || popoverState.accentColor || 'var(--accent)' } as any}>Set as Target</div>
            )}

            {isSetManager ? (
                availableSets.map(setName => <div key={setName} className="popover-item" data-menu-item="true" data-is-menu="true" onPointerDown={(e) => { e.stopPropagation(); }} onClick={() => setPopoverState({ ...popoverState, setId: setName })}>{setName}</div>)
            ) : (
                <>
                    {popoverState.type === 'menu' || !popoverState.type ? (
                        <>
                            {!isTacticalSet && popoverState.assignSourceId && (
                                <div className="popover-item" data-menu-item="true" onPointerDown={(e) => { e.stopPropagation(); }} style={{ borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))', color: 'var(--accent)', fontWeight: 'bold' }} onClick={() => { const setName = safeSetId; const dir = popoverState.assignSwipeDir; setButtons(prev => prev.map(b => b.id === popoverState.assignSourceId ? (dir ? { ...b, swipeCommands: { ...b.swipeCommands, [dir]: setName }, swipeActionTypes: { ...b.swipeActionTypes, [dir]: 'menu' } } : { ...b, command: setName, label: setName, actionType: 'menu' }) : b)); setPopoverState(null); addMessage('system', `Assigned sub-menu '${setName}'${dir ? ` to swipe ${dir}` : ''}.`); }}>Assign {safeSetId.toUpperCase()} as Menu</div>
                            )}
                            {renderActionButtons()}
                            {seenCommandsSize === 0 && isInlineMenu && !/sack|satchel|pouch|pack|quiver/i.test(popoverState.context || '') && popoverState.setId !== 'npc-shopkeeper' && (
                                <div className="popover-empty" style={{ padding: '8px', textAlign: 'center', opacity: 0.5, fontSize: '0.75rem' }}>No buttons available for this category</div>
                            )}
                            {openKeywordEdit && isInlineMenu && popoverState.context && (
                                <div className="popover-item" data-menu-item="true" onPointerDown={(e) => { e.stopPropagation(); }} style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: 4, opacity: 0.6, fontSize: '0.82rem' }} onClick={() => { triggerHaptic?.(20); openKeywordEdit(popoverState.context!, popoverState.context!); setPopoverState(null); }}>✏ Edit keyword "{popoverState.context}"</div>
                            )}
                        </>
                    ) : (popoverState.type === 'select-parley-command' || popoverState.type === 'select-parley-target') ? (
                        <ParleySection type={popoverState.type === 'select-parley-command' ? 'command' : 'target'} parley={parley} setParley={setParley} favorites={favorites} setFavorites={setFavorites} whoList={whoList} triggerHaptic={triggerHaptic} setPopoverState={setPopoverState} />
                    ) : null}
                </>
            )}
        </div>
    );
};
