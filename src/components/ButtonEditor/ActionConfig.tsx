import React from 'react';
import { CustomButton, ActionType } from '../../types';

interface ActionConfigProps {
    label: string;
    field: 'command' | 'longCommand';
    typeField: 'actionType' | 'longActionType';
    editingButton: CustomButton;
    availableSets: string[];
    updateButton: (id: string, updates: Partial<CustomButton>) => void;
}

const ActionConfig: React.FC<ActionConfigProps> = ({
    label,
    field,
    typeField,
    editingButton,
    availableSets,
    updateButton
}) => {
    const actionType = editingButton[typeField] || 'command';
    const isSetAction = actionType === 'nav' || actionType === 'menu' || actionType === 'assign' || actionType === 'select-assign';

    return (
        <div className="setting-group" style={{ marginBottom: '15px' }}>
            <label className="setting-label">{label}</label>
            <div style={{ display: 'flex', gap: '8px' }}>
                {isSetAction ? (
                    <select
                        className="setting-input"
                        value={editingButton[field] || ''}
                        onChange={e => updateButton(editingButton.id, { [field]: e.target.value })}
                    >
                        <option value="">Select Set...</option>
                        {availableSets.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                ) : (
                    <input
                        className="setting-input"
                        value={editingButton[field] || ''}
                        onChange={e => updateButton(editingButton.id, { [field]: e.target.value })}
                        placeholder="Command..."
                    />
                )}
                <select
                    className="setting-input"
                    style={{ width: '130px' }}
                    value={editingButton[typeField] || 'command'}
                    onChange={e => updateButton(editingButton.id, { [typeField]: e.target.value as ActionType })}
                >
                    <option value="command">Command</option>
                    <option value="nav">Switch Set</option>
                    <option value="menu">Menu</option>
                    <option value="assign">Assign</option>
                    <option value="select-assign">Select & Assign</option>
                    <option value="teleport-manage">Teleport List</option>
                    <option value="select-recipient">Select Recipient</option>
                    <option value="preload">Preload Input</option>
                </select>
            </div>
        </div>
    );
};

export default ActionConfig;
