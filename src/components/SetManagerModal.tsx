import React, { useState } from 'react';
import { Trash2, Edit2, Plus, X } from 'lucide-react';
import { CustomButton } from '../types';

interface SetManagerModalProps {
    buttons: CustomButton[];
    availableSets: string[];
    onClose: () => void;
    onEditButton: (id: string) => void;
    onDeleteButton: (id: string) => void;
    onCreateButton: (defaults?: Partial<CustomButton>) => void;
    onDeleteSet: (setName: string) => void;
    onSaveAsDefault?: () => void;
    onSaveAsCoreDefault?: () => void;
    combatSet?: string;
    defaultSet?: string;
    onSetCombatSet?: (set: string) => void;
    onSetDefaultSet?: (set: string) => void;
}

const SetManagerModal: React.FC<SetManagerModalProps> = ({
    buttons,
    availableSets,
    onClose,
    onEditButton,
    onDeleteButton,
    onCreateButton,
    onDeleteSet,
    onSaveAsDefault,
    onSaveAsCoreDefault,
    combatSet,
    defaultSet,
    onSetCombatSet,
    onSetDefaultSet
}) => {
    const [selectedSet, setSelectedSet] = useState(availableSets[0] || 'main');

    const filteredButtons = buttons.filter(b => b.setId === selectedSet);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth: '600px', width: '95%' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title">Set Manager</div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                <div className="setting-group" style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                    <div style={{ flex: 1 }}>
                        <label className="setting-label" style={{ fontSize: '0.8rem' }}>Default Set</label>
                        <select
                            className="setting-input"
                            value={defaultSet || 'main'}
                            onChange={e => onSetDefaultSet && onSetDefaultSet(e.target.value)}
                        >
                            {availableSets.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div style={{ flex: 1 }}>
                        <label className="setting-label" style={{ fontSize: '0.8rem' }}>Combat Set (Auto-switch)</label>
                        <select
                            className="setting-input"
                            value={combatSet || ''}
                            onChange={e => onSetCombatSet && onSetCombatSet(e.target.value)}
                        >
                            <option value="">(None)</option>
                            {availableSets.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                <div className="setting-group">
                    <label className="setting-label">Select Set</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <select
                            className="setting-input"
                            value={selectedSet}
                            onChange={e => setSelectedSet(e.target.value)}
                            style={{ flex: 1 }}
                        >
                            {availableSets.map(set => (
                                <option key={set} value={set}>{set}</option>
                            ))}
                        </select>
                        <button
                            className="btn-primary"
                            style={{ width: 'auto', padding: '0 15px' }}
                            onClick={() => {
                                const newSet = prompt('Enter new set name:');
                                if (newSet) setSelectedSet(newSet);
                            }}
                            title="Create New Set"
                        >
                            <Plus size={18} />
                        </button>
                        {selectedSet !== 'main' && (
                            <button
                                className="btn-secondary"
                                style={{ width: 'auto', padding: '0 15px', borderColor: '#ef4444', color: '#ef4444', margin: 0 }}
                                onClick={() => {
                                    if (confirm(`Are you SURE you want to delete the "${selectedSet}" set and ALL its buttons?`)) {
                                        onDeleteSet(selectedSet);
                                        setSelectedSet('main');
                                    }
                                }}
                                title="Delete Current Set"
                            >
                                <Trash2 size={18} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="buttons-list" style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #333', borderRadius: '8px', padding: '10px' }}>
                    {filteredButtons.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
                            No buttons in this set.
                        </div>
                    ) : (
                        filteredButtons.map(button => (
                            <div key={button.id} className="buttons-list-item" style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '10px',
                                borderBottom: '1px solid #222',
                                background: 'rgba(255,255,255,0.02)',
                                marginBottom: '5px',
                                borderRadius: '4px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '50%',
                                        backgroundColor: button.style.backgroundColor,
                                        border: '1px solid #555'
                                    }} />
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>{button.label}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#888' }}>{button.command}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => onEditButton(button.id)}
                                        style={{ background: '#333', border: 'none', color: '#fff', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}
                                        title="Edit Layout/Details"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => onDeleteButton(button.id)}
                                        style={{ background: 'rgba(239, 68, 68, 0.2)', border: 'none', color: '#ef4444', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}
                                        title="Delete Button"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                    <button
                        className="btn-primary"
                        style={{ flex: 1 }}
                        onClick={() => onCreateButton({ setId: selectedSet })}
                    >
                        <Plus size={18} /> Add Button to "{selectedSet}"
                    </button>
                    {onSaveAsDefault && (
                        <button
                            className="btn-secondary"
                            style={{ flex: 1, margin: 0, borderColor: 'var(--accent)', color: 'var(--accent)' }}
                            onClick={() => {
                                onSaveAsDefault();
                                alert('Current configuration saved as your user default!');
                            }}
                        >
                            Save as User Default
                        </button>
                    )}
                    {onSaveAsCoreDefault && (
                        <button
                            className="btn-secondary"
                            style={{ flex: 1, margin: 0, borderColor: '#f59e0b', color: '#f59e0b' }}
                            onClick={() => {
                                if (confirm('Save this configuration as the Core default for all users? This will be used when resetting to Core defaults.')) {
                                    onSaveAsCoreDefault();
                                    alert('Current configuration saved as Core default!');
                                }
                            }}
                        >
                            Save as Core Default
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SetManagerModal;
