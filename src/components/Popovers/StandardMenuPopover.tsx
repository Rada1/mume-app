/**
 * @file StandardMenuPopover.tsx
 * @description Main orchestrator for entity and action popovers.
 */

import React from 'react';
import { CustomButton, MessageType, PopoverState, InlineCategoryConfig, GameEntity, ParleyState, GmcpOccupant, CharacterEntry } from '../../types';
import { DEFAULT_INLINE_CATEGORIES, canonicalizeCategoryId, resolveKindAndLocation, getTraitsForName, getTraitConfigsForName } from '../../utils/categorizationUtils';
import { getHierarchyChain, getRelevantSets, TRAIT_WEIGHTS, SET_DISPLAY_LABELS } from '../../utils/buttonHierarchyUtils';
import { isButtonValidForEntity } from '../../utils/actionUtils';
import { CircleHelp } from 'lucide-react';

// --- Sub-components ---
import { TraitToggleSection } from './StandardMenu/TraitToggleSection';
import { CharacterSelectSection } from './StandardMenu/CharacterSelectSection';
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
    setInlineCategories?: (val: InlineCategoryConfig[] | ((prev: InlineCategoryConfig[]) => InlineCategoryConfig[])) => void;
    isMendingMode?: boolean;
    setIsMendingMode?: (val: boolean) => void;
    setMendingTarget?: (val: string | null) => void;
    setIsEquipmentOpen?: (open: boolean) => void;
    setIsInventoryOpen?: (open: boolean) => void;
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

export const StandardMenuPopover: React.FC<StandardMenuProps> = (props) => {
    const {
        popoverState, buttons, availableSets, setPopoverState, setButtons, handleButtonClick, setTarget, addMessage, favorites,
        setFavorites, keywordOverrides, parley, setParley, whoList, executeCommand, inlineCategories, setInlineCategories,
        setIsInventoryOpen, refreshLogHighlights, triggerHaptic, openKeywordEdit, roomNpcs,
        entities, selectedObjectIds, clearObjectSelection, accountState, setAccountState, direction,
        themeColor
    } = props;

    const [isChoosingCategory, setIsChoosingCategory] = React.useState(false);
    const isSetManager = popoverState.setId === 'setmanager';
    
    const traitConfigs = popoverState.context ? getTraitConfigsForName(popoverState.context, inlineCategories || []) : [];
    const dynamicTraits = traitConfigs.map(c => c.id);
    const extraSets = traitConfigs.map(c => c.buttonSetId).filter(Boolean) as string[];
    const { kind, location } = resolveKindAndLocation(popoverState.kind, popoverState.location, popoverState.setId);

    // Build actual hierarchy chain
    const entity = popoverState.entityId ? entities[popoverState.entityId] : null;
    const relevantSets = entity 
        ? getRelevantSets(entity, extraSets)
        : Array.from(new Set([
            ...getHierarchyChain(kind, location),
            ...dynamicTraits,
            ...extraSets,
            ...(popoverState.category ? [canonicalizeCategoryId(popoverState.category)] : [])
          ]));

    const sortedSets = [...relevantSets].sort((a, b) => (TRAIT_WEIGHTS[b] || 0) - (TRAIT_WEIGHTS[a] || 0));
    const isTacticalSet = ['warriorskilllist', 'rangerskilllist', 'clericspelllist', 'thiefskilllist', 'magespelllist', 'doors'].includes(popoverState.setId);

    const toggleFavorite = (e: React.MouseEvent, command: string) => {
        e.stopPropagation();
        setFavorites(prev => prev.includes(command) ? prev.filter(id => id !== command) : [...prev, command]);
    };

    let seenCommandsSize = 0;
    const renderActionButtons = () => {
        const seenCommands = new Set<string>();
        const filterDeps = { buttons, inlineCategories: inlineCategories || [], roomNpcs, entities };
        
        const favoritedButtons = buttons.filter(b => {
            const isValid = popoverState.entityId 
                ? isButtonValidForEntity(b, popoverState.entityId, kind, location, filterDeps, popoverState.category, popoverState.setId)
                : true;
            if (!isValid) return false;
            return (relevantSets.includes(b.setId) || (NPC_SUBCATEGORIES.includes(popoverState.setId) && b.setId === 'npc')) && favorites.includes(b.command);
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
                    sortedSets.map((setId, chainIdx) => {
                        const setIdButtons = buttons.filter(b => {
                            if (b.setId !== setId || favorites.includes(b.command) || seenCommands.has(b.command)) return false;
                            const isValid = popoverState.entityId 
                                ? isButtonValidForEntity(b, popoverState.entityId, kind, location, filterDeps, popoverState.category, popoverState.setId)
                                : true;
                            if (isValid) seenCommands.add(b.command);
                            return isValid;
                        });

                        if (setIdButtons.length === 0) return null;
                        const label = SET_DISPLAY_LABELS[setId as keyof typeof SET_DISPLAY_LABELS] || (setId.startsWith('inline-') ? setId.replace('inline-', '').toUpperCase().replace(/-/g, ' ') : null);
                        
                        return (
                            <React.Fragment key={setId}>
                                {label && <div style={{ padding: '6px 12px 2px', fontSize: '0.6rem', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, color: 'var(--accent)' }}>{label}</div>}
                                {setIdButtons.map(b => <PopoverActionButton key={b.id} button={b} depth={chainIdx === 0 ? 0 : 1} isSubButton={chainIdx > 0} {...props} toggleFavorite={toggleFavorite} />)}
                            </React.Fragment>
                        );
                    })
                ) : (
                    buttons.filter(b => b.setId === popoverState.setId && !favorites.includes(b.command)).map(b => {
                        seenCommands.add(b.command);
                        return <PopoverActionButton key={b.id} button={b} {...props} toggleFavorite={toggleFavorite} />;
                    })
                )}
            </>
        );
        
        seenCommandsSize = seenCommands.size + favoritedButtons.length;
        return rendered;
    };

    // --- Special Cases ---
    if (popoverState.setId === 'play-character-select') {
        return <CharacterSelectSection accountState={accountState} setAccountState={setAccountState} executeCommand={executeCommand} handleCharacterClick={(char) => { triggerHaptic?.(20); executeCommand(`play ${char.name}`); setPopoverState(null); }} />;
    }

    const isInlineMenu = ['object', 'npc', 'player'].includes(kind) || ['inventorylist', 'equipmentlist', 'roomitems', 'roomnpcs', 'selection'].includes(popoverState.setId) || popoverState.setId.startsWith('object') || popoverState.setId.startsWith('npc');
    const isTargetable = !isTacticalSet && (['selection', 'inventorylist', 'equipmentlist', 'npc', 'player', 'object-corpse'].includes(popoverState.setId) || ['player', 'npc'].includes(kind) || (kind === 'object' && location === 'room') || NPC_SUBCATEGORIES.includes(popoverState.setId) || relevantSets.includes(popoverState.setId));

    return (
        <div style={{ '--accent': themeColor || 'var(--accent)', '--set-accent': themeColor || 'var(--accent)' } as any}>
            <div className="popover-header" onPointerDown={(e) => { e.stopPropagation(); }} style={{ cursor: !isSetManager ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))', marginBottom: '4px', paddingBottom: '4px', color: 'var(--accent)', fontWeight: 'bold' }} onClick={() => { triggerHaptic?.(20); if (!isSetManager) setPopoverState({ ...popoverState, setId: 'setmanager' }); }}>
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {isSetManager ? 'Main Menu' : ((selectedObjectIds?.size || 0) > 1 ? `${selectedObjectIds!.size} Items Selected` : (popoverState.context ? popoverState.context : (popoverState.direction ? `${popoverState.setId.toUpperCase()} (${popoverState.direction.toUpperCase()})` : popoverState.setId.replace(/^inline-?/, '').toUpperCase())))}
                    </span>
                    <span style={{ fontSize: '0.6rem', opacity: 0.6, fontWeight: 'normal', marginTop: '1px' }}>{popoverState.executeAndAssign ? 'select action to fire and remap button' : 'select action to fire'}</span>
                </div>
                {!isSetManager && (kind === 'object' || kind === 'npc' || kind === 'player') && (
                    <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                        {popoverState.context && <div title={`Help for ${popoverState.context}`} onClick={(e) => { e.stopPropagation(); triggerHaptic?.(20); executeCommand(`help ${popoverState.context}`, false, false, false, false, { fromUi: true }); setPopoverState(null); }} style={{ padding: '4px', color: 'var(--accent)', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', transition: 'all 0.2s ease' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}><CircleHelp size={16} /></div>}
                        <div onClick={(e) => { e.stopPropagation(); setIsChoosingCategory(!isChoosingCategory); }} style={{ padding: '4px 8px', fontSize: '0.65rem', background: isChoosingCategory ? 'var(--accent)' : 'rgba(255,255,255,0.1)', color: isChoosingCategory ? '#000' : 'var(--accent)', borderRadius: '4px', cursor: 'pointer', height: '24px', display: 'flex', alignItems: 'center' }}>TAG</div>
                    </div>
                )}
            </div>

            {isChoosingCategory && setInlineCategories && (
                <TraitToggleSection popoverState={popoverState} inlineCategories={inlineCategories || []} setInlineCategories={setInlineCategories} dynamicTraits={dynamicTraits} triggerHaptic={triggerHaptic} addMessage={addMessage} refreshLogHighlights={refreshLogHighlights} />
            )}

            {isTargetable && !isChoosingCategory && (
                <div className="popover-item" data-menu-item="true" onPointerDown={(e) => { e.stopPropagation(); }} onClick={() => { triggerHaptic?.(20); setTarget(popoverState.context || null); setPopoverState(null); }} style={{ '--set-accent': themeColor || popoverState.accentColor || 'var(--accent)' } as any}>Set as Target</div>
            )}

            {isSetManager ? (
                availableSets.map(setName => <div key={setName} className="popover-item" data-menu-item="true" data-is-menu="true" onPointerDown={(e) => { e.stopPropagation(); }} onClick={() => setPopoverState({ ...popoverState, setId: setName })}>{setName}</div>)
            ) : (
                <>
                    {popoverState.type === 'menu' || !popoverState.type ? (
                        <>
                            {!isTacticalSet && popoverState.assignSourceId && (
                                <div className="popover-item" data-menu-item="true" onPointerDown={(e) => { e.stopPropagation(); }} style={{ borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))', color: 'var(--accent)', fontWeight: 'bold' }} onClick={() => { const setName = popoverState.setId; const dir = popoverState.assignSwipeDir; setButtons(prev => prev.map(b => b.id === popoverState.assignSourceId ? (dir ? { ...b, swipeCommands: { ...b.swipeCommands, [dir]: setName }, swipeActionTypes: { ...b.swipeActionTypes, [dir]: 'menu' } } : { ...b, command: setName, label: setName, actionType: 'menu' }) : b)); setPopoverState(null); addMessage('system', `Assigned sub-menu '${setName}'${dir ? ` to swipe ${dir}` : ''}.`); }}>Assign {popoverState.setId.toUpperCase()} as Menu</div>
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
