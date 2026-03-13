import React from 'react';
import { CustomButton, MessageType, PopoverState } from '../../types';
import { isItemContainer } from '../../utils/gameUtils';

interface StandardMenuProps {
    popoverState: PopoverState;
    buttons: CustomButton[];
    availableSets: string[];
    setPopoverState: (val: PopoverState | null) => void;
    setButtons: React.Dispatch<React.SetStateAction<CustomButton[]>>;
    handleButtonClick: (b: CustomButton, e: any, context?: string) => void;
    setTarget: (target: string | null) => void;
    addMessage: (type: MessageType, content: string) => void;
    themeColor?: string;
    favorites: string[];
    setFavorites: (val: string[]) => void;
    parley: import('../../types').ParleyState;
    setParley: (val: import('../../types').ParleyState) => void;
    whoList: string[];
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
}

export const StandardMenuPopover: React.FC<StandardMenuProps> = ({
    popoverState, buttons, availableSets, setPopoverState, setButtons, handleButtonClick, setTarget, addMessage, themeColor, favorites, setFavorites, parley, setParley, whoList, executeCommand
}) => {
    const isSetManager = popoverState.setId === 'setmanager';
    const isTargetable = ['selection', 'inventorylist', 'equipmentlist'].includes(popoverState.setId);

    const toggleFavorite = (e: React.MouseEvent, command: string) => {
        e.stopPropagation();
        if (favorites.includes(command)) {
            setFavorites(favorites.filter(id => id !== command));
        } else {
            setFavorites([...favorites, command]);
        }
    };

    const renderButton = (button: CustomButton) => {
        const isFav = favorites.includes(button.command);
        return (
            <div
                key={button.id}
                className="popover-item"
                data-menu-item="true"
                data-is-menu={button.actionType === 'nav' || button.actionType === 'menu' ? "true" : "false"}
                onPointerDown={(e) => { e.stopPropagation(); }}
                onClick={(e) => {
                    // Prevent button action if clicking the star
                    const target = e.target as any;
                    if (target.closest ? target.closest('.favorite-star') : target.parentElement?.closest('.favorite-star')) return;

                    if (popoverState.assignSourceId) {
                        const isExecute = popoverState.executeAndAssign;
                        const dir = popoverState.assignSwipeDir;
                        setButtons(prev => prev.map(b => b.id === popoverState.assignSourceId ? (dir ? { ...b, swipeCommands: { ...b.swipeCommands, [dir]: button.command }, swipeActionTypes: { ...b.swipeActionTypes, [dir]: button.actionType || 'command' } } : { ...b, command: button.command, label: button.label, actionType: button.actionType || 'command' }) : b));
                        if (isExecute) handleButtonClick(button, e, popoverState.context);
                        setPopoverState(null); addMessage('system', `${isExecute ? 'Executed and assigned' : 'Assigned'} '${button.label}'${dir ? ` to swipe ${dir}` : ''}.`);
                    } else handleButtonClick(button, e, popoverState.context);
                }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' }}
            >
                <span style={{ pointerEvents: 'none' }}>{button.label}</span>
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

    const sectionButtons = buttons.filter(b => {
        if (b.setId === popoverState.setId) return true;
        if (['inline-shopkeeper', 'inline-innkeeper', 'inline-mounts', 'inline-guildmaster'].includes(popoverState.setId) && b.setId === 'inlinenpc') return true;
        return false;
    });

    const favoritedButtons = sectionButtons.filter(b => favorites.includes(b.command));
    const regularButtons = sectionButtons.filter(b => !favorites.includes(b.command));

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
                onClick={() => { if (!isSetManager) setPopoverState({ ...popoverState, setId: 'setmanager' }); }}>
                {isSetManager ? 'Select Button Set' : (popoverState.context ? popoverState.context : popoverState.setId.replace(/^inline-/, '').toUpperCase())}
            </div>

            {isTargetable && (
                <div className="popover-item" data-menu-item="true" onPointerDown={(e) => { e.stopPropagation(); }} onClick={() => {
                    setTarget(popoverState.context || null); setPopoverState(null);
                    addMessage('system', `Target set to: ${popoverState.context}`);
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
                            {favoritedButtons.map(renderButton)}
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', margin: '4px 0' }} />
                        </>
                    )}

                    {regularButtons.map(renderButton)}

                    {(() => {
                        const isInventoryOrEq = ['inventorylist', 'equipmentlist'].includes(popoverState.setId);
                        const context = (popoverState.context || '');
                        const isContainer = popoverState.isContainer || isItemContainer(context);

                        if (isInventoryOrEq && isContainer) {
                            const isQuiver = /quiver/i.test(context);
                            const containerActions = [
                                { label: 'Look In', cmd: 'look in %n' },
                                { label: 'Get Target', cmd: 'get target %n' },
                                { label: 'Put Target', cmd: 'put target %n' },
                                { label: 'Get All', cmd: 'get all %n' },
                                { label: 'Put All', cmd: 'put all %n' },
                                { label: 'Empty', cmd: 'empty %n' }
                            ];
                            if (isQuiver) containerActions.splice(1, 0, { label: 'Get Arrow', cmd: 'get arrow %n' });

                            return (
                                <>
                                    <div style={{ padding: '4px 8px', fontSize: '0.7rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px', borderTop: '1px solid var(--border-color, rgba(255,255,255,0.05))', marginTop: '4px' }}>Container</div>
                                    {containerActions.map(act => (
                                        <div
                                            key={act.label}
                                            className="popover-item"
                                            style={{ color: 'var(--accent)' }}
                                            onPointerDown={(e) => { e.stopPropagation(); }}
                                            onClick={(e) => {
                                                if (act.label === 'Look In') {
                                                    // Specialized Container Submenu flow
                                                    // @ts-ignore - captureStage added to deps, but we can access it via ref if we pass it, 
                                                    // but here we just need to trigger the sequence.
                                                    // Actually we need to set captureStage.current = 'container'
                                                    // Since we don't have direct access to captureStage ref here, 
                                                    // we'll rely on handleButtonClick or a specific pattern.
                                                    // Let's pass a special command prefix or rely on executeCommand.
                                                    executeCommand(`look in ${popoverState.context}`, true, true, true);
                                                    // We'll need a way to set the capture stage. 
                                                    // Let's use a convention: commands starting with 'look in ' trigger it.
                                                } else {
                                                    handleButtonClick({
                                                        id: `dynamic-${act.label}`,
                                                        command: act.cmd,
                                                        label: act.label,
                                                        actionType: 'command'
                                                    } as any, e, popoverState.context);
                                                }
                                            }}
                                        >
                                            {act.label}
                                        </div>
                                    ))}
                                </>
                            );
                        }

                        const isShopkeeper = popoverState.setId === 'inline-shopkeeper';
                        if (isShopkeeper) {
                            return (
                                <div
                                    className="popover-item"
                                    data-menu-item="true"
                                    data-is-menu="true"
                                    style={{ color: 'var(--accent)', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '4px' }}
                                    onPointerDown={(e) => { e.stopPropagation(); }}
                                    onClick={() => setPopoverState({ ...popoverState, type: 'shop-search' })}
                                >
                                    Browse Shop...
                                </div>
                            );
                        }

                        return null;
                    })()}
                    {sectionButtons.length === 0 && !/sack|satchel|pouch|pack|quiver/i.test(popoverState.context || '') && popoverState.setId !== 'inline-shopkeeper' && <div className="popover-empty">No buttons in '{popoverState.setId}'</div>}
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
                            onClick={() => { setParley({ ...parley, command: cmd as any }); setPopoverState(null); }}>
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
                            onClick={() => { setParley({ ...parley, target: name }); setPopoverState(null); }}>
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
