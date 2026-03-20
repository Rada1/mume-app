import React from 'react';
import { CustomButton, MessageType, PopoverState, InlineCategoryConfig } from '../../types';
import { isItemContainer, sanitizeGameTarget } from '../../utils/gameUtils';
import { DEFAULT_INLINE_CATEGORIES, getCategoryForName } from '../../utils/categorizationUtils';
import { getHierarchyChain } from '../../utils/buttonHierarchyUtils';

interface StandardMenuProps {
// ... existing props
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
    parley: import('../../types').ParleyState;
    setParley: (val: import('../../types').ParleyState) => void;
    whoList: string[];
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean, options?: { shouldFocus?: boolean, fromUi?: boolean }) => void;
    inlineCategories?: InlineCategoryConfig[];
    setInlineCategories?: React.Dispatch<React.SetStateAction<InlineCategoryConfig[]>>;
    isMendingMode?: boolean;
    setIsMendingMode?: (val: boolean) => void;
    setMendingTarget?: (val: string | null) => void;
    setIsItemsDrawerOpen?: (open: boolean) => void;
    refreshLogHighlights?: () => void;
    triggerHaptic?: (ms: number) => void;
}

export const StandardMenuPopover: React.FC<StandardMenuProps> = ({
    popoverState, buttons, availableSets, setPopoverState, setButtons, handleButtonClick, setTarget, addMessage, themeColor, favorites, setFavorites, parley, setParley, whoList, executeCommand, inlineCategories, setInlineCategories,
    isMendingMode, setIsMendingMode, setMendingTarget, setIsItemsDrawerOpen, refreshLogHighlights, triggerHaptic
}) => {
    const [isChoosingCategory, setIsChoosingCategory] = React.useState(false);
    const [selectedCatId, setSelectedCatId] = React.useState<string | null>(null);
    const isSetManager = popoverState.setId === 'setmanager';
    const NPC_SUBCATEGORIES = ['inline-mounts', 'inline-shopkeeper', 'inline-innkeeper', 'inline-guildmaster'];
    
    // Detect if this specific item name belongs to a category
    const detectedCatId = popoverState.context ? getCategoryForName(popoverState.context, inlineCategories) : null;
    
    // Build actual hierarchy chain
    const fullSetChain = getHierarchyChain(popoverState.setId, detectedCatId);

    const isTargetable = ['selection', 'inventorylist', 'equipmentlist', 'inlinenpc', 'inlineplayer', 'inline-corpses', ...NPC_SUBCATEGORIES, ...fullSetChain].includes(popoverState.setId);

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
        const isSubButton = depth > 0 || (NPC_SUBCATEGORIES.includes(popoverState.setId) && button.setId === popoverState.setId);
        
        return (
            <div
                key={button.id}
                className={`popover-item ${isSubButton ? 'is-sub-item' : ''}`}
                data-menu-item="true"
                data-is-menu={button.actionType === 'nav' || button.actionType === 'menu' || button.label === 'Look In' ? "true" : "false"}
                data-drop-cmd={button.command}
                data-drop-context={popoverState.context}
                data-drop-parent={popoverState.parentNoun}
                onPointerDown={(e) => { e.stopPropagation(); }}
                onClick={(e) => {
                    // Prevent button action if clicking the star
                    if (popoverState.assignSourceId) {
                        const isExecute = popoverState.executeAndAssign;
                        const dir = popoverState.assignSwipeDir;
                        setButtons(prev => prev.map(b => b.id === popoverState.assignSourceId ? (dir ? { ...b, swipeCommands: { ...b.swipeCommands, [dir]: button.command }, swipeActionTypes: { ...b.swipeActionTypes, [dir]: button.actionType || 'command' } } : { ...b, command: button.command, label: button.label, actionType: button.actionType || 'command' }) : b));
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
                        setIsItemsDrawerOpen?.(true);
                        setPopoverState(null);
                    } else {
                        handleButtonClick(button, e, popoverState.context, undefined, popoverState.parentNoun);
                    }
                }}
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    paddingLeft: `${16 + (depth * 16)}px` // Dynamic indent
                }}
            >
                <span style={{ pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                    {depth > 0 && <span style={{ opacity: 0.3, marginRight: '8px', fontSize: '0.8rem' }}>﹂</span>}
                    {button.label.replace(/%n/g, popoverState.context || '').replace(/%p/g, popoverState.parentNoun || '')}
                </span>
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
                        padding: '16px 20px', // Massive hitbox
                        margin: '-16px -16px -16px auto', // Offset padding to maintain layout
                        cursor: 'pointer',
                        userSelect: 'none',
                        WebkitTapHighlightColor: 'transparent',
                        zIndex: 10
                    }}
                >
                    {isFav ? '★' : '☆'}
                </div>
            </div>
        );
    };

    const favoritedButtons = buttons.filter(b => {
        if (fullSetChain.includes(b.setId)) return favorites.includes(b.command);
        if (NPC_SUBCATEGORIES.includes(popoverState.setId) && b.setId === 'inlinenpc') return favorites.includes(b.command);
        return false;
    });

    const isInlineMenu = (popoverState.setId.startsWith('inline-') || popoverState.setId === 'inlinenpc') && popoverState.setId !== 'inlineplayer';

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
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {isSetManager ? 'Main Menu' : (popoverState.context ? popoverState.context : popoverState.setId.replace(/^inline-?/, '').toUpperCase())}
                </span>
                {!isSetManager && (popoverState.setId.startsWith('inline-') || ['inlinenpc', 'inlineplayer'].includes(popoverState.setId)) && (
                    <div 
                        onClick={(e) => { e.stopPropagation(); setIsChoosingCategory(!isChoosingCategory); }}
                        style={{ 
                            marginLeft: '8px', 
                            padding: '4px 8px', 
                            fontSize: '0.65rem', 
                            background: isChoosingCategory ? 'var(--accent)' : 'rgba(255,255,255,0.1)', 
                            color: isChoosingCategory ? '#000' : 'var(--accent)', 
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        TAG
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
                                        // 1. Remove this keyword from all other categories
                                        const next = prev.map(c => ({
                                            ...c,
                                            keywords: (c.keywords || []).filter(k => k.toLowerCase() !== keyword)
                                        }));
                                        
                                        // 2. Add it to the selected category (ensure it exists in state first)
                                        const exists = next.some(c => c.id === cat.id);
                                        if (!exists) {
                                            return [...next, { ...cat, keywords: [keyword] }];
                                        }
                                        return next.map(c => c.id === cat.id ? { ...c, keywords: [...(c.keywords || []), keyword] } : c);
                                    });
                                    
                                    addMessage('system', `Categorized '${popoverState.context}' as ${cat.id.toUpperCase()}`);
                                    refreshLogHighlights?.();
                                    
                                    setTimeout(() => {
                                        setIsChoosingCategory(false);
                                        setPopoverState(null); // Close menu to refresh highlights
                                    }, 150);
                                }}
                            >
                                {cat.id.toUpperCase()}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isTargetable && (
                <div className="popover-item" data-menu-item="true" onPointerDown={(e) => { e.stopPropagation(); }} onClick={() => {
                    triggerHaptic?.(20);
                    setTarget(popoverState.context || null); setPopoverState(null);
                }}>Set as Target</div>
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
                    {popoverState.assignSourceId && (
                        <div
                            className="popover-item"
                            data-menu-item="true"
                            onPointerDown={(e) => { e.stopPropagation(); }}
                            style={{ borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))', color: 'var(--accent)', fontWeight: 'bold' }}
                            onClick={() => {
                                const setName = popoverState.setId;
                                const dir = popoverState.assignSwipeDir;
                                setButtons(prev => prev.map(b => b.id === popoverState.assignSourceId ? (dir ? { ...b, swipeCommands: { ...b.swipeCommands, [dir]: setName }, swipeActionTypes: { ...b.swipeActionTypes, [dir]: 'menu' } } : { ...b, command: setName, label: setName.toUpperCase(), actionType: 'menu' }) : b));
                                setPopoverState(null); addMessage('system', `Assigned sub-menu '${setName}'${dir ? ` to swipe ${dir}` : ''}.`);
                            }}
                        >
                            Assign {popoverState.setId.toUpperCase()} as Menu
                        </div>
                    )}
                    
                    {favoritedButtons.length > 0 && (
                        <>
                            <div style={{ padding: '4px 8px', fontSize: '0.65rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--accent)' }}>★ Favorites</div>
                            {favoritedButtons.map(b => renderButton(b))}
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', margin: '4px 0' }} />
                        </>
                    )}

                    {isInlineMenu ? (() => {
                        const seenCommands = new Set<string>();
                        return [...fullSetChain].reverse().map((setId, chainIdx) => {
                            const setIdButtons = buttons.filter(b => {
                                if (b.setId !== setId || favorites.includes(b.command)) return false;
                                if (seenCommands.has(b.command)) return false;
                                seenCommands.add(b.command);
                                return true;
                            });
                            if (setIdButtons.length === 0) return null;
                            const levelName = setId.replace(/^inline-?|npc/, '').toUpperCase();
                            const depth = chainIdx;
                            
                            return (
                                <React.Fragment key={setId}>
                                    <div style={{ 
                                        padding: '4px 8px', 
                                        paddingLeft: `${8 + (depth * 16)}px`,
                                        fontSize: '0.65rem', 
                                        opacity: 0.4, 
                                        textTransform: 'uppercase', 
                                        letterSpacing: '1px', 
                                        marginTop: chainIdx > 0 ? '8px' : '0',
                                        borderBottom: '1px solid rgba(255,255,255,0.05)'
                                    }}>
                                        {levelName} ACTIONS
                                    </div>
                                    {setIdButtons.map(b => renderButton(b, depth))}
                                </React.Fragment>
                            );
                        });
                    })() : (
                        // Render flat Main/Custom menu
                        buttons.filter(b => b.setId === popoverState.setId && !favorites.includes(b.command)).map(b => renderButton(b))
                    )}

                    {(() => {
                        return null;
                    })()}
                    {buttons.filter(b => fullSetChain.includes(b.setId)).length === 0 && !/sack|satchel|pouch|pack|quiver/i.test(popoverState.context || '') && popoverState.setId !== 'inline-shopkeeper' && <div className="popover-empty">No buttons in '{popoverState.setId}'</div>}
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
                const favTargets = whoList.filter(n => favorites.includes(`parley-tgt-${n}`));
                const otherTargets = whoList.filter(n => !favorites.includes(`parley-tgt-${n}`));
                const renderTarget = (name: string | null) => {
                    const favKey = name ? `parley-tgt-${name}` : null;
                    const isFav = favKey ? favorites.includes(favKey) : false;
                    const isActive = parley.target === name;
                    const label = name ?? '(No Target)';
                    return (
                        <div key={label} className="popover-item" data-menu-item="true"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: name === null ? 0.6 : 1 }}
                            onClick={() => { triggerHaptic?.(20); setParley({ ...parley, target: name }); setPopoverState(null); }}>
                            <span style={{ pointerEvents: 'none' }}>
                                {isActive && <span style={{ marginRight: 6, color: 'var(--accent)', fontSize: '0.9rem' }}>✓ </span>}
                                {label}
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
