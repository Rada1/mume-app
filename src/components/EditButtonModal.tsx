import React, { useState } from 'react';
import { Trash2, Copy } from 'lucide-react';
import { CustomButton, ActionType } from '../types';

interface EditButtonModalProps {
    editingButton: CustomButton;
    setEditingButtonId: (id: string | null) => void;
    deleteButton: (id: string) => void;
    setButtons: React.Dispatch<React.SetStateAction<CustomButton[]>>;
    availableSets: string[];
}

const EditButtonModal: React.FC<EditButtonModalProps> = ({
    editingButton,
    setEditingButtonId,
    deleteButton,
    setButtons,
    availableSets
}) => {
    const [activeTab, setActiveTab] = useState<'main' | 'gestures' | 'style' | 'triggers'>('main');

    const handleDuplicate = () => {
        const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2);
        const newBtn: CustomButton = {
            ...editingButton,
            id: newId,
            label: editingButton.label + ' (Copy)',
            style: {
                ...editingButton.style,
                x: (editingButton.style.x || 50) + 2,
                y: (editingButton.style.y || 50) + 2
            }
        };
        setButtons(prev => [...prev, newBtn]);
        setEditingButtonId(newId);
    };

    const updateButton = (id: string, updates: Partial<CustomButton>) => {
        setButtons(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    };

    const renderActionConfig = (label: string, field: 'command' | 'longCommand', typeField: 'actionType' | 'longActionType') => {
        const actionType = editingButton[typeField] || 'command';
        const isSetAction = actionType === 'nav' || actionType === 'menu' || actionType === 'assign';

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
                    </select>
                </div>
            </div>
        );
    };

    const renderSwipeConfig = (dir: 'up' | 'down' | 'left' | 'right') => {
        const actionType = editingButton.swipeActionTypes?.[dir] || 'command';
        const isSetAction = actionType === 'nav' || actionType === 'menu' || actionType === 'assign';

        return (
            <div className="setting-group" style={{ marginBottom: '10px' }}>
                <label className="setting-label" style={{ fontSize: '0.85em', color: '#aaa', textTransform: 'uppercase' }}>Swipe {dir}</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {isSetAction ? (
                        <select
                            className="setting-input"
                            value={editingButton.swipeCommands?.[dir] || ''}
                            onChange={e => {
                                const newSwipes = { ...editingButton.swipeCommands, [dir]: e.target.value };
                                if (!e.target.value) delete newSwipes[dir as keyof typeof newSwipes];
                                updateButton(editingButton.id, { swipeCommands: newSwipes });
                            }}
                        >
                            <option value="">Select Set...</option>
                            {availableSets.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    ) : (
                        <input
                            className="setting-input"
                            value={editingButton.swipeCommands?.[dir] || ''}
                            onChange={e => {
                                const newSwipes = { ...editingButton.swipeCommands, [dir]: e.target.value };
                                if (!e.target.value) delete newSwipes[dir as keyof typeof newSwipes];
                                updateButton(editingButton.id, { swipeCommands: newSwipes });
                            }}
                            placeholder={`Command (${dir})...`}
                        />
                    )}
                    <select
                        className="setting-input"
                        style={{ width: '130px' }}
                        value={editingButton.swipeActionTypes?.[dir] || 'command'}
                        onChange={e => {
                            const newTypes = { ...editingButton.swipeActionTypes, [dir]: e.target.value as ActionType };
                            updateButton(editingButton.id, { swipeActionTypes: newTypes });
                        }}
                    >
                        <option value="command">Command</option>
                        <option value="nav">Switch Set</option>
                        <option value="menu">Menu</option>
                        <option value="assign">Assign</option>
                    </select>
                </div>
            </div>
        );
    };

    return (
        <div className="modal-overlay" onClick={() => setEditingButtonId(null)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ minHeight: '550px', display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>
                <div className="modal-header">
                    <div className="modal-title">Edit Button</div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={handleDuplicate} title="Duplicate Button" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                            <Copy size={20} />
                        </button>
                        <button onClick={() => deleteButton(editingButton.id)} title="Delete Button" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                            <Trash2 size={20} />
                        </button>
                    </div>
                </div>

                <div className="modal-tabs" style={{ display: 'flex', gap: '5px', borderBottom: '1px solid #444', marginBottom: '15px' }}>
                    {['main', 'gestures', 'style', 'triggers'].map(tab => (
                        <div
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                                color: activeTab === tab ? '#fff' : '#aaa',
                                textTransform: 'capitalize',
                                fontWeight: activeTab === tab ? 'bold' : 'normal',
                                fontSize: '0.9rem'
                            }}
                        >
                            {tab}
                        </div>
                    ))}
                </div>

                <div className="modal-content" style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
                    {activeTab === 'main' && (
                        <>
                            <div className="setting-group">
                                <label className="setting-label">Label</label>
                                <input className="setting-input" value={editingButton.label} onChange={e => updateButton(editingButton.id, { label: e.target.value })} />
                            </div>
                            <div className="setting-group">
                                <label className="setting-label">Assigned Set ID</label>
                                <input className="setting-input" value={editingButton.setId || 'main'} onChange={e => updateButton(editingButton.id, { setId: e.target.value })} />
                            </div>
                            {renderActionConfig('Primary Action (Tap)', 'command', 'actionType')}
                            <div className="setting-group">
                                <label className="setting-label">Display Mode</label>
                                <select className="setting-input" value={editingButton.display} onChange={e => updateButton(editingButton.id, { display: e.target.value as any })}>
                                    <option value="floating">Floating Button</option>
                                    <option value="inline">Inline Highlight</option>
                                </select>
                            </div>
                        </>
                    )}

                    {activeTab === 'gestures' && (
                        <>
                            {renderActionConfig('Long Press Action', 'longCommand', 'longActionType')}
                            <div style={{ borderTop: '1px solid #333', paddingTop: '15px', marginTop: '15px' }}>
                                <label className="setting-label" style={{ marginBottom: '10px', display: 'block', color: 'var(--accent)' }}>Swipe Gestures</label>
                                {renderSwipeConfig('up')}
                                {renderSwipeConfig('down')}
                                {renderSwipeConfig('left')}
                                {renderSwipeConfig('right')}
                            </div>
                        </>
                    )}

                    {activeTab === 'style' && (
                        <>
                            <div className="setting-group">
                                <label className="setting-label">Background Color</label>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <input type="color" className="setting-input" style={{ height: '40px', width: '60px', padding: 0 }} value={editingButton.style.backgroundColor} onChange={e => updateButton(editingButton.id, { style: { ...editingButton.style, backgroundColor: e.target.value } })} />
                                    <input className="setting-input" value={editingButton.style.backgroundColor} onChange={e => updateButton(editingButton.id, { style: { ...editingButton.style, backgroundColor: e.target.value } })} />
                                </div>
                            </div>
                            <div className="setting-group">
                                <label className="setting-label">Shape</label>
                                <select className="setting-input" value={editingButton.style.shape} onChange={e => updateButton(editingButton.id, { style: { ...editingButton.style, shape: e.target.value as any } })}>
                                    <option value="rect">Rectangle</option>
                                    <option value="pill">Pill</option>
                                    <option value="circle">Circle</option>
                                </select>
                            </div>
                            <div className="setting-group">
                                <label className="setting-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={editingButton.style.transparent} onChange={e => updateButton(editingButton.id, { style: { ...editingButton.style, transparent: e.target.checked } })} />
                                    Transparent Background
                                </label>
                            </div>
                        </>
                    )}

                    {activeTab === 'triggers' && (
                        <>
                            <div className="setting-group">
                                <label className="setting-label">Match Text (Pattern)</label>
                                <input className="setting-input" placeholder="Text to match..." value={editingButton.trigger?.pattern || ''} onChange={e => updateButton(editingButton.id, { trigger: { ...editingButton.trigger!, pattern: e.target.value } })} />
                            </div>
                            <div className="setting-group" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                                <label className="setting-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={editingButton.trigger?.enabled} onChange={e => updateButton(editingButton.id, { trigger: { ...editingButton.trigger!, enabled: e.target.checked } })} />
                                    Enable Trigger
                                </label>
                                <label className="setting-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={editingButton.trigger?.isRegex} onChange={e => updateButton(editingButton.id, { trigger: { ...editingButton.trigger!, isRegex: e.target.checked } })} />
                                    Use Regex
                                </label>
                            </div>
                            <div className="setting-group" style={{ marginTop: '10px' }}>
                                <label className="setting-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={editingButton.trigger?.autoHide} onChange={e => updateButton(editingButton.id, { trigger: { ...editingButton.trigger!, autoHide: e.target.checked } })} />
                                    Hide Button on Click
                                </label>
                            </div>
                            <div className="setting-group">
                                <label className="setting-label">Auto-Hide Timer (seconds)</label>
                                <input type="number" className="setting-input" value={editingButton.trigger?.duration || 0} onChange={e => updateButton(editingButton.id, { trigger: { ...editingButton.trigger!, duration: parseInt(e.target.value) || 0 } })} />
                                <span className="setting-helper">Set to 0 to disable auto-hide.</span>
                            </div>
                        </>
                    )}
                </div>

                <div className="modal-footer" style={{ marginTop: '15px' }}>
                    <button className="btn-primary" onClick={() => setEditingButtonId(null)}>
                        Save & Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditButtonModal;
