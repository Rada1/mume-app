import React from 'react';
import { CustomButton, ActionType, SwipeDirection } from '../../types';

interface SwipeConfigProps {
    dir: SwipeDirection;
    editingButton: CustomButton;
    availableSets: string[];
    updateButton: (id: string, updates: Partial<CustomButton>) => void;
    isLongSwipe?: boolean;
}

const SwipeConfig: React.FC<SwipeConfigProps> = ({
    dir,
    editingButton,
    availableSets,
    updateButton,
    isLongSwipe = false
}) => {
    const actionTypeField = isLongSwipe ? 'longSwipeActionTypes' : 'swipeActionTypes';
    const commandField = isLongSwipe ? 'longSwipeCommands' : 'swipeCommands';

    const actionType = editingButton[actionTypeField]?.[dir] || (isLongSwipe ? 'assign' : 'command');
    const isSetAction = actionType === 'nav' || actionType === 'menu' || actionType === 'assign' || actionType === 'select-assign';

    const handleCommandChange = (val: string) => {
        const newCmds = { ...editingButton[commandField], [dir]: val };
        if (!val) delete (newCmds as any)[dir];
        updateButton(editingButton.id, { [commandField]: newCmds });
    };

    const handleActionTypeChange = (val: ActionType) => {
        const newTypes = { ...editingButton[actionTypeField], [dir]: val };
        updateButton(editingButton.id, { [actionTypeField]: newTypes });
    };

    return (
        <div style={{ display: 'flex', gap: '8px' }}>
            {isSetAction ? (
                <select
                    className="setting-input"
                    value={editingButton[commandField]?.[dir] || ''}
                    onChange={e => handleCommandChange(e.target.value)}
                >
                    <option value="">Select Set...</option>
                    {availableSets.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            ) : (
                <input
                    className="setting-input"
                    value={editingButton[commandField]?.[dir] || ''}
                    onChange={e => handleCommandChange(e.target.value)}
                    placeholder="Cmd..."
                />
            )}
            <select
                className="setting-input"
                style={{ width: '100px' }}
                value={actionType}
                onChange={e => handleActionTypeChange(e.target.value as ActionType)}
            >
                <option value="command">Cmd</option>
                <option value="nav">Set</option>
                <option value="menu">Menu</option>
                <option value="assign">Assign</option>
                <option value="select-assign">S&A</option>
                <option value="select-recipient">Recip</option>
                <option value="teleport-manage">Tele</option>
            </select>
        </div>
    );
};

export default SwipeConfig;
