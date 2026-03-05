import React from 'react';
import { Trash2 } from 'lucide-react';
import { GameAction } from '../../types';

interface ActionSettingsProps {
    actions: GameAction[];
    setActions: React.Dispatch<React.SetStateAction<GameAction[]>>;
}

const ActionSettings: React.FC<ActionSettingsProps> = ({
    actions,
    setActions,
}) => {
    return (
        <>
            <div className="setting-group">
                <label className="setting-label">Add New Pattern Action</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <input
                        id="new-action-pattern"
                        className="setting-input"
                        placeholder="Trigger Pattern..."
                        style={{ flex: 1 }}
                    />
                    <input
                        id="new-action-command"
                        className="setting-input"
                        placeholder="Command string..."
                        style={{ flex: 1 }}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="checkbox" id="new-action-regex" />
                        <label htmlFor="new-action-regex" style={{ color: '#aaa', fontSize: '0.9rem', cursor: 'pointer' }}>Regex?</label>
                    </div>
                    <button
                        className="btn-primary"
                        style={{ padding: '6px 12px', margin: 0 }}
                        onClick={() => {
                            const patternInput = document.getElementById('new-action-pattern') as HTMLInputElement;
                            const commandInput = document.getElementById('new-action-command') as HTMLInputElement;
                            const regexInput = document.getElementById('new-action-regex') as HTMLInputElement;
                            if (patternInput?.value && commandInput?.value) {
                                setActions(prev => [...prev, {
                                    id: Math.random().toString(36).substring(2, 9),
                                    pattern: patternInput.value,
                                    command: commandInput.value,
                                    isRegex: regexInput.checked,
                                    enabled: true
                                }]);
                                patternInput.value = '';
                                commandInput.value = '';
                                regexInput.checked = false;
                            }
                        }}
                    >
                        Add Action
                    </button>
                </div>
            </div>

            <div style={{ marginTop: '20px' }}>
                <label className="setting-label">Active Actions</label>
                {!actions?.length && <div style={{ color: '#64748b', fontStyle: 'italic', padding: '10px' }}>No actions defined yet.</div>}
                {actions?.map(a => (
                    <div key={a.id} className="sound-item" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                            type="checkbox"
                            checked={a.enabled}
                            onChange={(e) => setActions(prev => prev.map(pa => pa.id === a.id ? { ...pa, enabled: e.target.checked } : pa))}
                        />
                        <div style={{ overflow: 'hidden', flex: 1 }}>
                            <div style={{ color: a.enabled ? 'white' : '#666', fontWeight: 'bold' }}>{a.pattern} {a.isRegex ? <span style={{ fontSize: '0.7rem', color: '#10b981', marginLeft: '4px' }}>[Regex]</span> : ''}</div>
                            <div style={{ color: a.enabled ? '#aaa' : '#444', fontSize: '0.8rem', fontFamily: 'monospace' }}>→ {a.command}</div>
                        </div>
                        <button onClick={() => setActions(prev => prev.filter(pa => pa.id !== a.id))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </>
    );
};

export default ActionSettings;
