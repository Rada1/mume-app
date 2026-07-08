/**
 * @file StandardMenuPopover.tsx
 * @description Main orchestrator for entity and action popovers.
 */

import React from 'react';
import { CharacterInfo, CustomButton, MessageType, PopoverState, InlineCategoryConfig, GameEntity, ParleyState, GmcpOccupant, CharacterEntry, CustomTraitConfig } from '../../types';
import { isButtonValidForEntity } from '../../utils/actionUtils';
import { getButtonIdsForTraits, getCategoryConfig, getResolvedTraitSections, getTraitsForName as getInlineActionTraits } from '../../utils/inlineActionModel';
import { getInlineCategoryAxes, getInlineCategoryLabel, normalizeInlineCategoryId } from '../../utils/inlineCategoryAxes';
import { formatMumeTarget, sanitizeGameTarget } from '../../utils/gameUtils';
import { User, Users, Skull, GraduationCap, Store, Coins, Sword, Trash2, Package, Utensils, Droplets, Flame, BookOpen, Shield, Box } from 'lucide-react';

// --- Sub-components ---
import { TraitToggleSection } from './StandardMenu/TraitToggleSection';
import { PopoverActionButton } from './StandardMenu/PopoverActionButton';
import { ParleySection } from './StandardMenu/ParleySection';
import { CapturedDetailsCard } from './StandardMenu/CapturedDetailsCard';

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
    characterInfo?: CharacterInfo;
}

const formatSetLabel = (id: string): string => {
    const category = getCategoryConfig(id);
    if (category) return category.label;
    return id.replace(/^(inline|cat)-/, '').replace(/-/g, ' ').toUpperCase();
};

const stripAnsiCodes = (text: string): string => {
    if (!text) return '';
    return text.replace(/[\u001b\x1b\u2190]\[[0-9;]*[a-zA-Z]/g, '');
};

const resolveEntityCategoryIcon = (categoryId: string, resolvedTraitIds: string[]) => {
    // Look at traits first as they are more specific (e.g. guildmaster, weapon)
    if (resolvedTraitIds.includes('trait-guildmaster')) return GraduationCap;
    if (resolvedTraitIds.includes('trait-shopkeeper') || resolvedTraitIds.includes('trait-innkeeper')) return Store;
    if (resolvedTraitIds.includes('trait-mount')) return Coins;
    if (resolvedTraitIds.includes('trait-weapon')) return Sword;
    if (resolvedTraitIds.includes('trait-corpse') || resolvedTraitIds.includes('trait-darkie-corpse')) return Trash2;
    if (resolvedTraitIds.includes('trait-container')) return Package;
    if (resolvedTraitIds.includes('trait-food')) return Utensils;
    if (resolvedTraitIds.includes('trait-water') || resolvedTraitIds.includes('trait-fluid-container') || resolvedTraitIds.includes('trait-quaffable')) return Droplets;
    if (resolvedTraitIds.includes('trait-poison')) return Skull;
    if (resolvedTraitIds.includes('trait-lightsource') || resolvedTraitIds.includes('trait-lantern-worn')) return Flame;
    if (resolvedTraitIds.includes('trait-book') || resolvedTraitIds.includes('trait-reciteable')) return BookOpen;
    if (resolvedTraitIds.includes('trait-sheath')) return Shield;

    // Then check categoryId
    if (categoryId === 'cat-ally' || categoryId === 'cat-ally-remote') return User;
    if (categoryId === 'cat-enemy') return Skull;
    if (categoryId === 'cat-npc' || categoryId === 'cat-neutral') return Users;
    if (categoryId === 'cat-container-item') return Package;
    if (categoryId === 'cat-worn-object') return Shield;
    if (categoryId === 'cat-object' || categoryId === 'cat-room-object') return Box;

    return null;
};

export const StandardMenuPopover: React.FC<StandardMenuProps> = (props) => {
    const {
        popoverState, buttons, availableSets, setPopoverState, setButtons, handleButtonClick, setTarget, addMessage, favorites,
        setFavorites, keywordOverrides, parley, setParley, whoList, executeCommand, inlineCategories, customTraits, setCustomTraits,
        handleTabClick, setGearTab, setPlayersTab, setCharTab,
        refreshLogHighlights, triggerHaptic, openKeywordEdit, roomNpcs,
        entities, selectedObjectIds, clearObjectSelection, accountState, setAccountState, direction, characterInfo,
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
        const filterDeps = { buttons, inlineCategories: inlineCategories || [], roomNpcs, entities, characterInfo };

        const favoritedButtons = buttons.filter(b => {
            const isValid = isButtonValidForEntity(b, popoverState.entityId || '', categoryId, filterDeps, safeSetId, popoverState.context);
            if (!isValid) return false;
            return resolvedTraitButtonIds.has(b.id) && favorites.includes(b.command);
        });

        const rendered = (
            <>
                {isInlineMenu ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', padding: '2px 0' }}>
                        {favoritedButtons.length > 0 && (<>
                            <div style={{ fontSize: '0.58rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, color: '#ffd700', padding: '5px 8px 5px 8px', textAlign: 'right', borderRight: '1px solid rgba(255,255,255,0.12)', alignSelf: 'flex-start' }}>★ Favs</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '4px 8px', alignSelf: 'flex-start' }}>
                                {favoritedButtons.map(b => <PopoverActionButton key={b.id} button={b} {...props} toggleFavorite={toggleFavorite} compact glowDelay="0s" />)}
                            </div>
                        </>)}
                        {(() => {
                            let rowIndex = favoritedButtons.length > 0 ? 1 : 0;
                            return sectionDefs.map((section) => {
                            const sectionButtons = buttons.filter(b => {
                                if (!section.buttonIds.includes(b.id) || favorites.includes(b.command) || seenCommands.has(b.command)) return false;
                                const isValid = isButtonValidForEntity(b, popoverState.entityId || '', categoryId, filterDeps, safeSetId, popoverState.context);
                                if (isValid) seenCommands.add(b.command);
                                return isValid;
                            });
                            if (sectionButtons.length === 0 && section.key !== 'trait-consider') return null;
                            const delay = `${(rowIndex++) * 0.3}s`;
                            return (<React.Fragment key={section.key}>
                                <div style={{ fontSize: '0.58rem', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, color: 'var(--accent)', padding: '5px 8px 5px 8px', textAlign: 'right', borderRight: '1px solid rgba(255,255,255,0.12)', alignSelf: 'flex-start' }}>
                                    {section.label}
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '4px 8px', alignSelf: 'flex-start', width: '100%', alignItems: 'center' }}>
                                    {sectionButtons.map(b => <PopoverActionButton key={b.id} button={b} {...props} toggleFavorite={toggleFavorite} handleTabClick={handleTabClick} setGearTab={setGearTab} compact glowDelay={delay} />)}
                                    {section.key === 'trait-consider' && ['cat-npc', 'cat-enemy', 'cat-neutral', 'cat-ally'].includes(categoryId) && (
                                        <button
                                            className="popover-action-chip fight-btn"
                                            onPointerDown={(e) => e.stopPropagation()}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                triggerHaptic?.(30);
                                                const target = sanitizeGameTarget(popoverState.context || '');
                                                executeCommand(`kill ${target}`, false, false);
                                                setPopoverState(null);
                                            }}
                                            style={{
                                                marginLeft: 'auto',
                                                background: 'linear-gradient(180deg, rgba(220, 38, 38, 0.45), rgba(153, 27, 27, 0.35))',
                                                borderColor: 'rgba(239, 68, 68, 0.6)',
                                                color: '#fee2e2',
                                                fontWeight: 800,
                                                fontSize: '0.78rem',
                                                padding: '4px 10px',
                                                borderRadius: '4px',
                                                border: '1px solid rgba(239, 68, 68, 0.6)',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '3px',
                                                boxShadow: '0 0 8px rgba(220, 38, 38, 0.35)',
                                                userSelect: 'none',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px'
                                            }}
                                        >
                                            ⚔ Fight
                                        </button>
                                    )}
                                </div>
                            </React.Fragment>);
                        })})()}
                    </div>
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
    const headerContext = categoryAxes.isCharacter ? targetContext : popoverState.context;
    const cleanHeaderContext = headerContext ? stripAnsiCodes(headerContext) : null;
    const cleanDisplayName = popoverState.displayName
        ? stripAnsiCodes(popoverState.displayName)
        : (entity?.name ? stripAnsiCodes(entity.name) : cleanHeaderContext);
    const cleanKeyword = popoverState.keyword
        ? stripAnsiCodes(popoverState.keyword)
        : cleanHeaderContext;
    const shouldShowKeyword = !!(
        cleanDisplayName &&
        cleanKeyword &&
        cleanDisplayName.toLowerCase() !== cleanKeyword.toLowerCase()
    );
    const categoryLabel = isSetManager ? '' : (() => {
        if (categoryAxes.isInlineAction) return getInlineCategoryLabel(categoryId);
        return safeSetId ? formatSetLabel(safeSetId) : '';
    })();
    const stopKeywordEvent = (event: React.SyntheticEvent) => {
        event.stopPropagation();
        event.preventDefault();
        event.nativeEvent.stopImmediatePropagation?.();
    };

    const editKeyword = (event: React.MouseEvent | React.KeyboardEvent) => {
        stopKeywordEvent(event);
        if (!openKeywordEdit || !popoverState.context) return;
        triggerHaptic?.(20);
        openKeywordEdit(popoverState.context, cleanDisplayName || popoverState.context);
        setPopoverState(null);
    };

    const renderHeaderSubtitle = () => {
        if (popoverState.executeAndAssign) return 'select action to fire and remap button';
        return (
            <>
                {categoryLabel && <span>{categoryLabel}</span>}
                {shouldShowKeyword && (
                    <span
                        data-keyword-editor="true"
                        role={openKeywordEdit ? 'button' : undefined}
                        tabIndex={openKeywordEdit ? 0 : undefined}
                        title={openKeywordEdit ? 'Edit keyword' : undefined}
                        onPointerDown={stopKeywordEvent}
                        onPointerUp={stopKeywordEvent}
                        onClick={editKeyword}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') editKeyword(event);
                        }}
                        style={{
                            cursor: openKeywordEdit ? 'pointer' : 'default',
                            color: 'var(--accent)',
                            opacity: 0.92,
                            textDecoration: openKeywordEdit ? 'underline' : 'none',
                            textUnderlineOffset: '2px'
                        }}
                    >
                        ({cleanKeyword})
                    </span>
                )}
            </>
        );
    };

    const isParleyType = popoverState.type === 'select-parley-command' || popoverState.type === 'select-parley-target';
    const CategoryIcon = !isSetManager ? resolveEntityCategoryIcon(categoryId, resolvedTraitIds) : null;

    return (
        <div ref={menuRootRef} style={{ '--accent': themeColor || 'var(--accent)', '--set-accent': themeColor || 'var(--accent)' } as any}>
            {!isParleyType && (
                <div className="popover-header" onPointerDown={(e) => { e.stopPropagation(); }} style={{ cursor: !isSetManager ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))', marginBottom: '3px', paddingBottom: '3px', color: 'var(--accent)', fontWeight: 'bold', textTransform: 'none' }} onClick={(event) => { if (event.target instanceof HTMLElement && event.target.closest('[data-keyword-editor="true"]')) return; triggerHaptic?.(20); if (!isSetManager) setPopoverState({ ...popoverState, setId: 'setmanager' }); }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
                        {CategoryIcon && <CategoryIcon size={16} style={{ flexShrink: 0, opacity: 0.8 }} />}
                        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {isSetManager ? 'Main Menu' : (cleanDisplayName ? cleanDisplayName : (popoverState.direction ? `${formatSetLabel(safeSetId).toUpperCase()} (${popoverState.direction.toUpperCase()})` : formatSetLabel(safeSetId).toUpperCase()))}
                            </span>
                            <span style={{ fontSize: '0.6rem', opacity: 0.6, fontWeight: 'normal', marginTop: '1px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{renderHeaderSubtitle()}</span>
                        </div>
                    </div>
                    {!isSetManager && categoryAxes.isInlineAction && (
                        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                            <div onClick={(e) => { e.stopPropagation(); setIsChoosingCategory(!isChoosingCategory); }} style={{ padding: '2px 6px', fontSize: '0.6rem', background: isChoosingCategory ? 'var(--accent)' : 'rgba(255,255,255,0.1)', color: isChoosingCategory ? '#000' : 'var(--accent)', borderRadius: '4px', cursor: 'pointer', height: '22px', display: 'flex', alignItems: 'center' }}>TRAIT</div>
                        </div>
                    )}
                </div>
            )}

            {isChoosingCategory && setCustomTraits && (
                <TraitToggleSection popoverState={popoverState} customTraits={customTraits || []} setCustomTraits={setCustomTraits} activeTraits={resolvedTraitIds} keywordTraits={keywordTraitIds} triggerHaptic={triggerHaptic} addMessage={addMessage} refreshLogHighlights={refreshLogHighlights} characterInfo={characterInfo} />
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
                            <CapturedDetailsCard
                                examineLines={popoverState.capturedExamineLines}
                                considerLines={popoverState.capturedConsiderLines}
                                isCapturingExamine={popoverState.isCapturingExamine}
                                isCapturingConsider={popoverState.isCapturingConsider}
                                whoisLines={popoverState.capturedWhoisLines}
                                isCapturingWhois={popoverState.isCapturingWhois}
                            />
                            {renderActionButtons()}
                            {seenCommandsSize === 0 && isInlineMenu && !/sack|satchel|pouch|pack|quiver/i.test(popoverState.context || '') && popoverState.setId !== 'npc-shopkeeper' && (
                                <div className="popover-empty" style={{ padding: '8px', textAlign: 'center', opacity: 0.5, fontSize: '0.75rem' }}>No buttons available for this category</div>
                            )}
                            {openKeywordEdit && isInlineMenu && popoverState.context && (
                                <div className="popover-item" data-menu-item="true" onPointerDown={(e) => { e.stopPropagation(); }} style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: 4, opacity: 0.6, fontSize: '0.82rem' }} onClick={() => { triggerHaptic?.(20); openKeywordEdit(popoverState.context!, cleanDisplayName || popoverState.context!); setPopoverState(null); }}>✏ Edit keyword "{stripAnsiCodes(popoverState.context)}"</div>
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
