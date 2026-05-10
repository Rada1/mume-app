/**
 * @file StandardMenuPopover.tsx
 * @description Main orchestrator for entity and action popovers.
 */

import React from 'react';
import { CustomButton, MessageType, PopoverState, InlineCategoryConfig, GameEntity, ParleyState, GmcpOccupant, CharacterEntry, CustomTraitConfig } from '../../types';
import { resolveKindAndLocation } from '../../utils/categorizationUtils';
import { isButtonValidForEntity } from '../../utils/actionUtils';
import { getButtonIdsForTraits, getCategoryConfig, getResolvedTraitSections, getTraitsForName as getInlineActionTraits } from '../../utils/inlineActionModel';
import { formatMumeTarget } from '../../utils/gameUtils';
import { CircleHelp } from 'lucide-react';

// --- Sub-components ---
import { TraitToggleSection } from './StandardMenu/TraitToggleSection';
import { TraitFilterRail } from './StandardMenu/TraitFilterRail';
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
    const [activeTraitFilter, setActiveTraitFilter] = React.useState<string | null>(null);
    const menuRootRef = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        setIsChoosingCategory(!!popoverState.isChoosingCategory);
    }, [popoverState.isChoosingCategory, popoverState.context, popoverState.setId]);
    React.useEffect(() => {
        setActiveTraitFilter(null);
    }, [popoverState.context, popoverState.category, popoverState.setId]);
    const safeSetId = popoverState.setId ?? '';
    const isSetManager = safeSetId === 'setmanager';
    
    const { kind, location } = resolveKindAndLocation(popoverState.kind, popoverState.location, safeSetId);
    const resolvedTraitSections = getResolvedTraitSections(
        popoverState.category || safeSetId || kind,
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
    React.useEffect(() => {
        if (activeTraitFilter && !sectionDefs.some(section => section.key === activeTraitFilter)) {
            setActiveTraitFilter(null);
        }
    }, [activeTraitFilter, sectionDefs]);
    const isTacticalSet = ['warriorskilllist', 'rangerskilllist', 'clericspelllist', 'thiefskilllist', 'magespelllist', 'doors'].includes(safeSetId);
    const isCharacterKind = ['npc', 'enemy', 'neutral', 'ally', 'player'].includes(kind);
    const targetContext = formatMumeTarget(popoverState.context) || popoverState.context || null;
    const toggleFavorite = (e: React.MouseEvent, command: string) => {
        e.stopPropagation();
        setFavorites(prev => prev.includes(command) ? prev.filter(id => id !== command) : [...prev, command]);
    };

    let seenCommandsSize = 0;
    const renderActionButtons = () => {
        const seenCommands = new Set<string>();
        const filterDeps = { buttons, inlineCategories: inlineCategories || [], roomNpcs, entities };
        const activeSection = activeTraitFilter ? sectionDefs.find(section => section.key === activeTraitFilter) : null;
        
        const favoritedButtons = buttons.filter(b => {
            if (activeSection && !activeSection.buttonIds.includes(b.id)) return false;
            const isValid = isButtonValidForEntity(b, popoverState.entityId || '', kind, location, filterDeps, popoverState.category, safeSetId, popoverState.context);
            if (!isValid) return false;
            const suppliedByTrait = resolvedTraitButtonIds.has(b.id);
            return suppliedByTrait && favorites.includes(b.command);
        });

        const rendered = (
            <>
                {favoritedButtons.length > 0 && (
                    <>
                        <div style={{ padding: '4px 8px', fontSize: '0.65rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--accent)' }}>★ Favorites</div>
                        {favoritedButtons.map(b => <PopoverActionButton key={b.id} button={b} {...props} toggleFavorite={toggleFavorite} />)}
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', margin: '4px 0' }} />
                    </>
                )}

                {isInlineMenu ? (
                    sectionDefs
                    .filter(section => !activeTraitFilter || section.key === activeTraitFilter)
                    .map((section) => {
                        const setIdButtons = buttons.filter(b => {
                            const suppliedBySection = section.buttonIds.includes(b.id);
                            if (!suppliedBySection || favorites.includes(b.command) || seenCommands.has(b.command)) return false;
                            const isValid = isButtonValidForEntity(b, popoverState.entityId || '', kind, location, filterDeps, popoverState.category, safeSetId, popoverState.context);
                            if (isValid) seenCommands.add(b.command);
                            return isValid;
                        });

                        if (setIdButtons.length === 0) return null;
                        
                        return (
                            <React.Fragment key={section.key}>
                                {section.label && <div style={{ padding: '6px 12px 2px', fontSize: '0.6rem', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, color: 'var(--accent)' }}>{section.label}</div>}
                                {setIdButtons.map(b => <PopoverActionButton key={b.id} button={b} {...props} toggleFavorite={toggleFavorite} handleTabClick={handleTabClick} setGearTab={setGearTab} />)}
                            </React.Fragment>
                        );
                    })
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

    const isInlineMenu = ['object', 'npc', 'player', 'ally', 'enemy', 'neutral'].includes(kind) || ['inventorylist', 'equipmentlist', 'roomitems', 'roomnpcs', 'selection'].includes(safeSetId) || safeSetId.startsWith('object') || safeSetId.startsWith('npc');
    const isTargetable = !isTacticalSet && (['selection', 'inventorylist', 'equipmentlist', 'npc', 'player', 'object-corpse'].includes(safeSetId) || ['player', 'ally', 'npc', 'enemy', 'neutral'].includes(kind) || (kind === 'object' && location === 'room') || NPC_SUBCATEGORIES.includes(safeSetId));
    const headerContext = isCharacterKind ? targetContext : popoverState.context;
    const categoryLabel = isSetManager ? '' : (() => {
        // Character kinds: always show the kind label, never the specific setId trait name
        const charKindLabels: Record<string, string> = {
            'player': 'Ally', 'ally': 'Ally', 'enemy': 'Enemy', 'neutral': 'Neutral', 'npc': 'NPC'
        };
        if (charKindLabels[kind]) return charKindLabels[kind];
        // Non-character kinds: use specific set label first (shows location for objects: OBJ CARRIED, OBJ WORN, etc.)
        if (safeSetId) return formatSetLabel(safeSetId);
        const otherKindLabels: Record<string, string> = { 'object': 'Object', 'room': 'Room', 'exit': 'Exit' };
        if (otherKindLabels[kind]) return otherKindLabels[kind];
        const source = safeSetId.replace(/^inline-/, '');
        return source.replace(/-/g, ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    })();

    return (
        <div ref={menuRootRef} style={{ '--accent': themeColor || 'var(--accent)', '--set-accent': themeColor || 'var(--accent)' } as any}>
            <div className="popover-header" onPointerDown={(e) => { e.stopPropagation(); }} style={{ cursor: !isSetManager ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))', marginBottom: '4px', paddingBottom: '4px', color: 'var(--accent)', fontWeight: 'bold' }} onClick={() => { triggerHaptic?.(20); if (!isSetManager) setPopoverState({ ...popoverState, setId: 'setmanager' }); }}>
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {isSetManager ? 'Main Menu' : ((selectedObjectIds?.size || 0) > 1 ? `${selectedObjectIds!.size} Items Selected` : (headerContext ? headerContext : (popoverState.direction ? `${formatSetLabel(safeSetId).toUpperCase()} (${popoverState.direction.toUpperCase()})` : formatSetLabel(safeSetId).toUpperCase())))}
                    </span>
                    <span style={{ fontSize: '0.6rem', opacity: 0.6, fontWeight: 'normal', marginTop: '1px' }}>{popoverState.executeAndAssign ? 'select action to fire and remap button' : categoryLabel}</span>
                </div>
                {!isSetManager && (kind === 'object' || kind === 'npc' || kind === 'player' || kind === 'ally' || kind === 'enemy' || kind === 'neutral') && (
                    <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                        {popoverState.context && <div title={`Help for ${popoverState.context}`} onClick={(e) => { e.stopPropagation(); triggerHaptic?.(20); executeCommand(`help ${popoverState.context}`, false, false, false, false, { fromUi: true }); setPopoverState(null); }} style={{ padding: '4px', color: 'var(--accent)', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', transition: 'all 0.2s ease' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}><CircleHelp size={16} /></div>}
                        <div onClick={(e) => { e.stopPropagation(); setIsChoosingCategory(!isChoosingCategory); }} style={{ padding: '4px 8px', fontSize: '0.65rem', background: isChoosingCategory ? 'var(--accent)' : 'rgba(255,255,255,0.1)', color: isChoosingCategory ? '#000' : 'var(--accent)', borderRadius: '4px', cursor: 'pointer', height: '24px', display: 'flex', alignItems: 'center' }}>TRAIT</div>
                    </div>
                )}
            </div>

            {isChoosingCategory && setCustomTraits && (
                <TraitToggleSection popoverState={popoverState} customTraits={customTraits || []} setCustomTraits={setCustomTraits} activeTraits={resolvedTraitIds} keywordTraits={keywordTraitIds} triggerHaptic={triggerHaptic} addMessage={addMessage} refreshLogHighlights={refreshLogHighlights} />
            )}

            {!isChoosingCategory && isInlineMenu && (
                <TraitFilterRail
                    anchorRef={menuRootRef}
                    traits={sectionDefs}
                    activeKey={activeTraitFilter}
                    onChange={setActiveTraitFilter}
                    triggerHaptic={triggerHaptic}
                />
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
                                <div className="popover-empty" style={{ padding: '12px', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem' }}>No buttons available for this {kind}</div>
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
