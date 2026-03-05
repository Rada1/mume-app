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
                onPointerDown={(e) => e.preventDefault()}
                style={{ cursor: !isSetManager ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '4px', paddingBottom: '4px' }}
                onClick={() => { if (!isSetManager) setPopoverState({ ...popoverState, setId: 'setmanager' }); }}>
                {isSetManager ? 'Select Button Set' : `Actions: ${popoverState.context || popoverState.setId} ▾`}
            </div>

            {isTargetable && (
                <div className="popover-item" onPointerDown={(e) => e.preventDefault()} onClick={() => {
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
                        onPointerDown={(e) => e.preventDefault()}
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
                            onPointerDown={(e) => e.preventDefault()}
                            style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--accent)', fontWeight: 'bold' }}
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
                    {buttons.filter(b => b.setId === popoverState.setId).map(button => (
                        <div
                            key={button.id}
                            className="popover-item"
                            data-menu-item="true"
                            onPointerDown={(e) => e.preventDefault()}
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
                    {buttons.filter(b => b.setId === popoverState.setId).length === 0 && <div className="popover-empty">No buttons in '{popoverState.setId}'</div>}
                </>
            )}
        </>
    );
};
