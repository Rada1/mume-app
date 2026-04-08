import React from 'react';
import { CustomButton, MessageType, PopoverState, InlineCategoryConfig, GameEntity, ParleyState, GmcpOccupant } from '../../types';
import { isItemContainer, sanitizeGameTarget } from '../../utils/gameUtils';
import { getEffectiveKeyword } from '../../utils/keywordUtils';
import { DEFAULT_INLINE_CATEGORIES, getCategoryForName } from '../../utils/categorizationUtils';
import { getHierarchyChain } from '../../utils/buttonHierarchyUtils';
import { isButtonValidForEntity } from '../../utils/actionUtils';
import { CircleHelp } from 'lucide-react';

interface StandardMenuProps {
    popoverState: PopoverState;
    buttons: CustomButton[];
    availableSets: string[];
    setPopoverState: React.Dispatch<React.SetStateAction<PopoverState | null>>;
    setButtons: React.Dispatch<React.SetStateAction<CustomButton[]>>;
    handleButtonClick: (button: CustomButton, e: any, context?: string, isContainer?: boolean, parentNoun?: string) => void;
    setTarget: (target: string | null) => void;
    addMessage: (type: MessageType, content: string) => void;
    themeColor?: string;
    favorites: string[];
    setFavorites: (val: string[]) => void;
    keywordOverrides?: Record<string, string>;
    parley: ParleyState;
    setParley: (val: ParleyState) => void;
    whoList: string[];
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean, options?: { shouldFocus?: boolean, fromUi?: boolean }) => void;
    inlineCategories?: InlineCategoryConfig[];
    setInlineCategories?: React.Dispatch<React.SetStateAction<InlineCategoryConfig[]>>;
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
}

export const StandardMenuPopover: React.FC<StandardMenuProps> = ({
    popoverState, buttons, availableSets, setPopoverState, setButtons, handleButtonClick, setTarget, addMessage, themeColor,    favorites,
    setFavorites,
    keywordOverrides,
    parley, setParley, whoList, executeCommand, inlineCategories, setInlineCategories,
    isMendingMode, setIsMendingMode, setMendingTarget, setIsEquipmentOpen, setIsInventoryOpen, refreshLogHighlights, triggerHaptic, openKeywordEdit, roomPlayers, roomNpcs, roomItems,
    entities, selectedObjectIds, clearObjectSelection
}) => {
    const [isChoosingCategory, setIsChoosingCategory] = React.useState(false);
    const [selectedCatId, setSelectedCatId] = React.useState<string | null>(null);
    const isSetManager = popoverState.setId === 'setmanager';
    const NPC_SUBCATEGORIES = ['inline-mounts', 'inline-shopkeeper', 'inline-innkeeper', 'inline-guildmaster'];
    
    // Detect if this specific item name belongs to a category
    const detectedCatId = popoverState.category || (popoverState.context ? getCategoryForName(popoverState.context, inlineCategories) : null);
    
    // Build actual hierarchy chain
    const fullSetChain = getHierarchyChain(popoverState.setId, detectedCatId);

    const isTacticalSet = ['warriorskilllist', 'rangerskilllist', 'clericspelllist', 'thiefskilllist', 'magespelllist', 'doors'].includes(popoverState.setId);
    const isTargetable = !isTacticalSet && ['selection', 'inventorylist', 'equipmentlist', 'inlinenpc', 'inlineplayer', 'inline-corpses', ...NPC_SUBCATEGORIES, ...fullSetChain].includes(popoverState.setId);

    const toggleFavorite = (e: React.MouseEvent, command: string) => {
        e.stopPropagation();
        if (favorites.includes(command)) {
            setFavorites(favorites.filter(id => id !== command));
        } else {
            setFavorites([...favorites, command]);
        }
    };

    const renderButton = (button: CustomButton, depth: number = 0) => {
        const isFav = favorites.includes(button.command);
        const isSubButton = depth > 0 || (NPC_SUBCATEGORIES.includes(popoverState.setId) && button.setId === 'inlinenpc');
        
        return (
            <div
                key={button.id}
                className={`popover-item ${isSubButton ? 'is-sub-item' : ''}`}
                data-menu-item="true"
                data-is-menu={['nav', 'menu', 'select-assign', 'select-recipient', 'select-container', 'assign', 'teleport-manage'].includes(button.actionType || '') || button.label === 'Look In' ? "true" : "false"}
                data-drop-cmd={button.command}
                data-drop-context={popoverState.context}
                data-drop-parent={popoverState.parentNoun}
                onPointerDown={(e) => { e.stopPropagation(); }}
                onClick={(e) => {
                    if (popoverState.assignSourceId) {
                        const isExecute = popoverState.executeAndAssign;
                        const dir = popoverState.assignSwipeDir;
                        setButtons(prev => prev.map(b => b.id === popoverState.assignSourceId ? (dir ? { 
                            ...b, 
                            swipeCommands: { ...(b.swipeCommands || {}), [dir]: button.command }, 
                            swipeActionTypes: { ...(b.swipeActionTypes || {}), [dir]: button.actionType || 'command' } 
                        } : { ...b, command: button.command, label: button.label, actionType: button.actionType || 'command' }) : b));
                        if (isExecute) handleButtonClick(button, e, popoverState.context, undefined, popoverState.parentNoun);
                        setPopoverState(null);
                        addMessage('system', `${isExecute ? 'Executed and assigned' : 'Assigned'} '${button.label}'${dir ? ` to swipe ${dir}` : ''}.`);
                    } else if (button.label === 'Look In') {
                        const target = sanitizeGameTarget(popoverState.context || '');
                        executeCommand(`look in ${target}`, true, true);
                        setPopoverState((prev: any) => {
                            if (!prev) return null;
                            return { ...prev, type: 'container', containerItems: [] };
                        });
                    } else if (button.label === 'Browse Shop...') {
                        setPopoverState({ ...popoverState, type: 'shop-search' });
                    } else if (button.command === 'shop-mend') {
                        setIsInventoryOpen?.(true);
                        setPopoverState(null);
                    } else {
                        // MULTI-ACTION LOGIC
                        if (selectedObjectIds && selectedObjectIds.size > 1) {
                            const selectedEntries = Array.from(selectedObjectIds) as string[];
                            selectedEntries.forEach(entry => {
                                const parts = entry.split(':');
                                const id = parts.length > 2 ? parts[1] : (parts.length === 2 ? parts[1] : parts[0]);
                                const context = parts.length > 2 ? parts[2] : undefined;
                                
                                // Resolves the noun from entity registry if possible, else fallback to extracting from ID
                                let noun = context || "";
                                if (entities[id]) {
                                    const entity = entities[id];
                                    noun = getEffectiveKeyword(entity.name || '', undefined, entity, keywordOverrides || {});
                                } else if (!noun) {
                                    noun = id.replace(/^(auto-item-|log-item-|inline-obj-|auto-npc-|auto-obj-|roomnpcs:|roomitems:|inventorylist:|equipmentlist:)/, '')
                                             .replace(/-[a-f0-9]+$/, '').replace(/-/g, ' ');
                                }
                                
                                handleButtonClick(button, e as any, noun, undefined, popoverState.parentNoun);
                            });
                            clearObjectSelection();
                            setPopoverState(null);
                        } else {
                            handleButtonClick(button, e as any, popoverState.context, undefined, popoverState.parentNoun);
                        }
                    }
                }}
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    paddingLeft: `${16 + (depth * 16)}px`, // Dynamic indent
                    '--set-accent': button.style.borderColor || button.style.backgroundColor || 'var(--accent)'
                } as any}
            >
                <span style={{ pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                    {depth > 0 && <span style={{ opacity: 0.3, marginRight: '8px', fontSize: '0.8rem' }}>﹂</span>}
                    {button.label.replace(/%n/g, popoverState.context || '').replace(/%p/g, popoverState.parentNoun || '')}
                </span>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    {popoverState.context && (
                        <div 
                            title={`Help for ${button.command.split(' ')[0]}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                triggerHaptic?.(20);
                                const keyword = button.command.split(' ')[0] || button.label.toLowerCase();
                                executeCommand(`help ${keyword}`, false, false, false, false, { fromUi: true });
                                setPopoverState(null);
                            }}
                            style={{ 
                                padding: '8px', 
                                opacity: 0.4, 
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'opacity 0.2s ease',
                                WebkitTapHighlightColor: 'transparent'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.4'}
                        >
                            <CircleHelp size={14} />
                        </div>
                    )}
                    <div 
                        className={`favorite-star ${isFav ? 'active' : ''}`}
                        onClick={(e) => toggleFavorite(e, button.command)}
                        style={{ 
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: isFav ? 1 : 0.3, 
                            color: isFav ? '#ffd700' : 'inherit',
                            fontSize: '1.2rem',
                            transition: 'all 0.2s ease',
                            padding: '16px 14px', 
                            margin: '-16px -16px -16px auto', 
                            cursor: 'pointer',
                            userSelect: 'none',
                            WebkitTapHighlightColor: 'transparent',
                            zIndex: 10
                        }}
                    >
                        {isFav ? '★' : '☆'}
                    </div>
                </div>
            </div>
        );
    };

    const favoritedButtons = buttons.filter(b => {
        // Use the centralized validator
        const filterDeps = { buttons, inlineCategories, roomNpcs, entities };
        const isValid = popoverState.entityId 
            ? isButtonValidForEntity(b, popoverState.entityId, popoverState.setId, filterDeps, popoverState.category)
            : true;

        if (!isValid) return false;

        if (fullSetChain.includes(b.setId)) return favorites.includes(b.command);
        if (NPC_SUBCATEGORIES.includes(popoverState.setId) && b.setId === 'inlinenpc') return favorites.includes(b.command);
        return false;
    });

    const isInlineMenu = (popoverState.setId.startsWith('inline-') || popoverState.setId === 'inlinenpc' || popoverState.setId === 'inventorylist' || popoverState.setId === 'equipmentlist') && popoverState.setId !== 'inlineplayer';

    return (
        <>
            <div className="popover-header"
                onPointerDown={(e) => { e.stopPropagation(); }}
                style={{
                    cursor: !isSetManager ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                    marginBottom: '4px',
                    paddingBottom: '4px',
                    color: 'var(--accent)',
                    fontWeight: 'bold'
                }}
                onClick={() => { 
                    triggerHaptic?.(20);
                    if (!isSetManager) setPopoverState({ ...popoverState, setId: 'setmanager' }); 
                }}>
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {isSetManager ? 'Main Menu' : (
                            (selectedObjectIds?.size || 0) > 1 
                            ? `${selectedObjectIds!.size} Items Selected` 
                            : (popoverState.context ? popoverState.context : popoverState.setId.replace(/^inline-?/, '').toUpperCase())
                        )}
                    </span>
                    <span style={{ fontSize: '0.6rem', opacity: 0.6, fontWeight: 'normal', marginTop: '1px' }}>
                        {popoverState.executeAndAssign ? 'select action to fire and remap button' : 'select action to fire'}
                    </span>
                </div>
                {!isSetManager && (popoverState.setId.startsWith('inline-') || ['inlinenpc', 'inlineplayer'].includes(popoverState.setId)) && (
                    <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                        {popoverState.context && (
                            <div 
                                title={`Help for ${popoverState.context}`}
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    triggerHaptic?.(20);
                                    executeCommand(`help ${popoverState.context}`, false, false, false, false, { fromUi: true });
                                    setPopoverState(null);
                                }}
                                style={{ 
                                    padding: '4px', 
                                    color: 'var(--accent)', 
                                    borderRadius: '50%',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            >
                                <CircleHelp size={16} />
                            </div>
                        )}
                        <div 
                            onClick={(e) => { e.stopPropagation(); setIsChoosingCategory(!isChoosingCategory); }}
                            style={{ 
                                padding: '4px 8px', 
                                fontSize: '0.65rem', 
                                background: isChoosingCategory ? 'var(--accent)' : 'rgba(255,255,255,0.1)', 
                                color: isChoosingCategory ? '#000' : 'var(--accent)', 
                                borderRadius: '4px',
                                cursor: 'pointer',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            TAG
                        </div>
                    </div>
                )}
            </div>

            {isChoosingCategory && (
                <div style={{ padding: '4px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '8px' }}>
                    <div style={{ fontSize: '0.65rem', opacity: 0.5, marginBottom: '6px', textAlign: 'center' }}>CHANGE CATEGORY</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
                        {DEFAULT_INLINE_CATEGORIES.map(cat => (
                            <div 
                                key={cat.id}
                                className="popover-item"
                                style={{ 
                                    padding: '6px', 
                                    fontSize: '0.7rem', 
                                    textAlign: 'center',
                                    background: selectedCatId === cat.id ? 'var(--accent)' : (detectedCatId === `inline-${cat.id}` ? 'rgba(255,255,255,0.1)' : 'transparent'),
                                    border: `1px solid ${cat.color || 'rgba(255,255,255,0.2)'}`,
                                    color: selectedCatId === cat.id ? '#000' : (cat.color || '#fff'),
                                    transition: 'all 0.1s ease'
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!setInlineCategories || !inlineCategories || !popoverState.context) return;
                                    
                                    triggerHaptic?.(30);
                                    setSelectedCatId(cat.id);
                                    
                                    const keyword = popoverState.context.toLowerCase();
                                    setInlineCategories(prev => {
                                        const next = prev.map(c => ({
                                            ...c,
                                            keywords: (c.keywords || []).filter(k => k.toLowerCase() !== keyword)
                                        }));
                                        const exists = next.some(c => c.id === cat.id);
                                        if (!exists) {
                                            return [...next, { ...cat, keywords: [keyword] }];
                                        }
                                        return next.map(c => c.id === cat.id ? { ...c, keywords: [...(c.keywords || []), keyword] } : c);
                                    });
                                    
                                    console.log('[DEBUG] Categorizing:', { context: popoverState.context, catId: cat.id, setId: popoverState.setId });
                                    if (addMessage) {
                                        addMessage('system', `Categorized '${popoverState.context}' as ${cat.id.toUpperCase()}`);
                                    } else {
                                        console.warn('[WARN] addMessage is missing in StandardMenuPopover');
                                    }
                                    refreshLogHighlights?.();
                                    
                                    setTimeout(() => {
                                        setIsChoosingCategory(false);
                                        setPopoverState(null);
                                    }, 150);
                                }}
                            >
                                {cat.id.toUpperCase()}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isTargetable && !isChoosingCategory && (
                <div 
                    className="popover-item" 
                    data-menu-item="true" 
                    onPointerDown={(e) => { e.stopPropagation(); }} 
                    onClick={() => {
                        triggerHaptic?.(20);
                        setTarget(popoverState.context || null); setPopoverState(null);
                    }}
                    style={{ '--set-accent': popoverState.accentColor || 'var(--accent)' } as any}
                >Set as Target</div>
            )}

            {isSetManager ? (
                availableSets.map(setName => (
                    <div
                        key={setName}
                        className="popover-item"
                        data-menu-item="true"
                        data-is-menu="true"
                        onPointerDown={(e) => { e.stopPropagation(); }}
                        onClick={() => setPopoverState({ ...popoverState, setId: setName })}
                    >
                        {setName}
                    </div>
                ))
            ) : (
                <>
                    {!isTacticalSet && popoverState.assignSourceId && (
                        <div
                            className="popover-item"
                            data-menu-item="true"
                            onPointerDown={(e) => { e.stopPropagation(); }}
                            style={{ borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))', color: 'var(--accent)', fontWeight: 'bold' }}
                            onClick={() => {
                                const setName = popoverState.setId;
                                const dir = popoverState.assignSwipeDir;
                                setButtons(prev => prev.map(b => b.id === popoverState.assignSourceId ? (dir ? { ...b, swipeCommands: { ...b.swipeCommands, [dir]: setName }, swipeActionTypes: { ...b.swipeActionTypes, [dir]: 'menu' } } : { ...b, command: setName, label: setName, actionType: 'menu' }) : b));
                                setPopoverState(null); addMessage('system', `Assigned sub-menu '${setName}'${dir ? ` to swipe ${dir}` : ''}.`);
                            }}
                        >
                            Assign {popoverState.setId.toUpperCase()} as Menu
                        </div>
                    )}
                    
                    {popoverState.type === 'menu' || !popoverState.type ? (
                        <>
                            {favoritedButtons.length > 0 && (
                                <>
                                    <div style={{ padding: '4px 8px', fontSize: '0.65rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--accent)' }}>★ Favorites</div>
                                    {favoritedButtons.map(b => renderButton(b))}
                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', margin: '4px 0' }} />
                                </>
                            )}

                            {isInlineMenu ? (() => {
                                const seenCommands = new Set<string>();
                                const filterDeps = { buttons, inlineCategories, roomNpcs, entities };

                                return [...fullSetChain].reverse().map((setId, chainIdx) => {
                                    const setIdButtons = buttons.filter(b => {
                                        if (b.setId !== setId || favorites.includes(b.command)) return false;
                                        if (seenCommands.has(b.command)) return false;
                                        
                                        const isValid = popoverState.entityId 
                                            ? isButtonValidForEntity(b, popoverState.entityId, popoverState.setId, filterDeps, popoverState.category)
                                            : true;

                                        if (isValid) {
                                            seenCommands.add(b.command);
                                        }
                                        return isValid;
                                    });
                                    if (setIdButtons.length === 0) return null;
                                    const depth = chainIdx;
                                    
                                    return (
                                        <React.Fragment key={setId}>
                                            {setIdButtons.map(b => renderButton(b, depth))}
                                        </React.Fragment>
                                    );
                                });
                            })() : (
                                buttons.filter(b => b.setId === popoverState.setId && !favorites.includes(b.command)).map(b => renderButton(b))
                            )}

                            {buttons.filter(b => fullSetChain.includes(b.setId)).length === 0 && !/sack|satchel|pouch|pack|quiver/i.test(popoverState.context || '') && popoverState.setId !== 'inline-shopkeeper' && <div className="popover-empty">No buttons in '{popoverState.setId}'</div>}

                            {openKeywordEdit && isInlineMenu && popoverState.context && (
                                <div
                                    className="popover-item"
                                    data-menu-item="true"
                                    onPointerDown={(e) => { e.stopPropagation(); }}
                                    style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: 4, opacity: 0.6, fontSize: '0.82rem' }}
                                    onClick={() => {
                                        triggerHaptic?.(20);
                                        openKeywordEdit(popoverState.context!, popoverState.context!);
                                        setPopoverState(null);
                                    }}
                                >
                                    ✏ Edit keyword "{popoverState.context}"
                                </div>
                            )}
                        </>
                    ) : null}
                </>
            )}

            {popoverState.type === 'select-parley-command' && (() => {
                const COMMANDS = ['tell', 'whisper', 'ask', 'say', 'narrate', 'shout', 'yell', 'sing'];
                const favCmds = COMMANDS.filter(c => favorites.includes(`parley-cmd-${c}`));
                const otherCmds = COMMANDS.filter(c => !favorites.includes(`parley-cmd-${c}`));
                const renderCmd = (cmd: string) => {
                    const favKey = `parley-cmd-${cmd}`;
                    const isFav = favorites.includes(favKey);
                    const isActive = parley.command === cmd;
                    return (
                        <div key={cmd} className="popover-item" data-menu-item="true"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                            onClick={() => { triggerHaptic?.(20); setParley({ ...parley, command: cmd as any }); setPopoverState(null); }}>
                            <span style={{ pointerEvents: 'none' }}>
                                {isActive && <span style={{ marginRight: 6, color: 'var(--accent)', fontSize: '0.9rem' }}>✓ </span>}
                                {cmd.toUpperCase()}
                            </span>
                            <div className={`favorite-star ${isFav ? 'active' : ''}`}
                                onClick={(e) => { e.stopPropagation(); setFavorites(isFav ? favorites.filter(f => f !== favKey) : [...favorites, favKey]); }}
                                style={{ opacity: isFav ? 1 : 0.3, color: isFav ? '#ffd700' : 'inherit', fontSize: '1.2rem', padding: '16px 20px', margin: '-16px -16px -16px auto', cursor: 'pointer', userSelect: 'none', WebkitTapHighlightColor: 'transparent' }}>
                                {isFav ? '★' : '☆'}
                            </div>
                        </div>
                    );
                };
                return (
                    <>
                        {favCmds.length > 0 && (<>
                            <div style={{ padding: '4px 8px', fontSize: '0.65rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--accent)' }}>★ Favorites</div>
                            {favCmds.map(renderCmd)}
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', margin: '4px 0' }} />
                        </>)}
                        {otherCmds.map(renderCmd)}
                    </>
                );
            })()}

            {popoverState.type === 'select-parley-target' && (() => {
                const favTargets = whoList.filter(n => {
                    const baseName = n.includes('|') ? n.split('|')[1] : n;
                    return favorites.includes(`parley-tgt-${baseName}`);
                });
                const otherTargets = whoList.filter(n => {
                    const baseName = n.includes('|') ? n.split('|')[1] : n;
                    return !favorites.includes(`parley-tgt-${baseName}`);
                });
                
                const renderTarget = (entry: string | null) => {
                    const [htmlDisplay, baseName] = entry && entry.includes('|') ? entry.split('|') : [entry, entry];
                    const favKey = baseName ? `parley-tgt-${baseName}` : null;
                    const isFav = favKey ? favorites.includes(favKey) : false;
                    const isActive = parley.target === baseName;
                    const label = baseName ?? '(No Target)';
                    
                    return (
                        <div key={label} className="popover-item" data-menu-item="true"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: entry === null ? 0.6 : 1 }}
                            onClick={() => { triggerHaptic?.(20); setParley({ ...parley, target: baseName }); setPopoverState(null); }}>
                            <span style={{ pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                                {isActive && <span style={{ marginRight: 6, color: 'var(--accent)', fontSize: '0.9rem' }}>✓ </span>}
                                {entry === null ? label : (
                                    <span 
                                        style={{ fontFamily: 'monospace', whiteSpace: 'pre', fontSize: '0.85rem' }} 
                                        dangerouslySetInnerHTML={{ __html: htmlDisplay! }} 
                                    />
                                )}
                            </span>
                            {favKey && (
                                <div className={`favorite-star ${isFav ? 'active' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); setFavorites(isFav ? favorites.filter(f => f !== favKey) : [...favorites, favKey]); }}
                                    style={{ opacity: isFav ? 1 : 0.3, color: isFav ? '#ffd700' : 'inherit', fontSize: '1.2rem', padding: '16px 20px', margin: '-16px -16px -16px auto', cursor: 'pointer', userSelect: 'none', WebkitTapHighlightColor: 'transparent' }}>
                                    {isFav ? '★' : '☆'}
                                </div>
                            )}
                        </div>
                    );
                };
                return (
                    <>
                        {renderTarget(null)}
                        {favTargets.length > 0 && (<>
                            <div style={{ padding: '4px 8px', fontSize: '0.65rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(255,255,255,0.05)', borderTop: '1px solid rgba(255,255,255,0.05)', color: 'var(--accent)' }}>★ Favorites</div>
                            {favTargets.map(n => renderTarget(n))}
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', margin: '4px 0' }} />
                        </>)}
                        {whoList.length === 0
                            ? <div className="popover-empty">No players in WHO list</div>
                            : otherTargets.map(n => renderTarget(n))
                        }
                    </>
                );
            })()}
        </>
    );
};
