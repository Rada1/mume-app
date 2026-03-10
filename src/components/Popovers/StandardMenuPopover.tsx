import React from 'react';
import { CustomButton, MessageType, PopoverState } from '../../types';

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
}


export const StandardMenuPopover: React.FC<StandardMenuProps> = ({
    popoverState, buttons, availableSets, setPopoverState, setButtons, handleButtonClick, setTarget, addMessage, themeColor
}) => {
    const isSetManager = popoverState.setId === 'setmanager';
    const isTargetable = ['selection', 'inventorylist', 'equipmentlist'].includes(popoverState.setId);

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
                    {buttons.filter(b => {
                        if (b.setId === popoverState.setId) return true;
                        // Special case: Shopkeepers, Innkeepers, and Mounts also show standard NPC buttons
                        if (['inline-shopkeeper', 'inline-innkeeper', 'inline-mounts', 'inline-guildmaster'].includes(popoverState.setId) && b.setId === 'inlinenpc') {
                            return true;
                        }
                        return false;
                    }).map(button => (
                        <div
                            key={button.id}
                            className="popover-item"
                            data-menu-item="true"
                            data-is-menu={button.actionType === 'nav' || button.actionType === 'menu' ? "true" : "false"}
                            onPointerDown={(e) => { e.stopPropagation(); }}
                            onClick={(e) => {
                                if (popoverState.assignSourceId) {
                                    const isExecute = popoverState.executeAndAssign;
                                    const dir = popoverState.assignSwipeDir;
                                    setButtons(prev => prev.map(b => b.id === popoverState.assignSourceId ? (dir ? { ...b, swipeCommands: { ...b.swipeCommands, [dir]: button.command }, swipeActionTypes: { ...b.swipeActionTypes, [dir]: button.actionType || 'command' } } : { ...b, command: button.command, label: button.label, actionType: button.actionType || 'command' }) : b));
                                    if (isExecute) handleButtonClick(button, e, popoverState.context);
                                    setPopoverState(null); addMessage('system', `${isExecute ? 'Executed and assigned' : 'Assigned'} '${button.label}'${dir ? ` to swipe ${dir}` : ''}.`);
                                } else handleButtonClick(button, e, popoverState.context);
                            }}
                        >
                            {button.label}
                        </div>
                    ))}
                    {(() => {
                        const context = (popoverState.context || '').toLowerCase();
                        const isInventoryOrEq = ['inventorylist', 'equipmentlist'].includes(popoverState.setId);
                        const isContainer = /sack|satchel|pouch|pack|quiver/i.test(context);

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
                                                handleButtonClick({
                                                    id: `dynamic-${act.label}`,
                                                    command: act.cmd,
                                                    label: act.label,
                                                    actionType: 'command'
                                                } as any, e, popoverState.context);
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
                    {buttons.filter(b => {
                        if (b.setId === popoverState.setId) return true;
                        if (['inline-shopkeeper', 'inline-innkeeper', 'inline-mounts', 'inline-guildmaster'].includes(popoverState.setId) && b.setId === 'inlinenpc') return true;
                        return false;
                    }).length === 0 && !/sack|satchel|pouch|pack|quiver/i.test(popoverState.context || '') && popoverState.setId !== 'inline-shopkeeper' && <div className="popover-empty">No buttons in '{popoverState.setId}'</div>}
                </>
            )}
        </>
    );
};
