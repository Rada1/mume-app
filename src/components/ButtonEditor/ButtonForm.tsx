import React from 'react';
import { CustomButton, SwipeDirection } from '../../types';
import ActionConfig from './ActionConfig';
import SwipeConfig from './SwipeConfig';

interface ButtonFormProps {
    activeTab: 'main' | 'gestures' | 'style' | 'triggers' | 'requirements';
    editingButton: CustomButton;
    availableSets: string[];
    updateButton: (id: string, updates: Partial<CustomButton>) => void;
    handleImageUpload: (file: File) => void;
}

const ButtonForm: React.FC<ButtonFormProps> = ({
    activeTab,
    editingButton,
    availableSets,
    updateButton,
    handleImageUpload
}) => {
    if (activeTab === 'main') {
        return (
            <>
                <div className="setting-group">
                    <label className="setting-label">Label</label>
                    <input className="setting-input" value={editingButton.label} onChange={e => updateButton(editingButton.id, { label: e.target.value })} />
                </div>
                <div className="setting-group">
                    <label className="setting-label">Assigned Set ID</label>
                    <input className="setting-input" value={editingButton.setId || 'main'} onChange={e => updateButton(editingButton.id, { setId: e.target.value })} />
                </div>
                <div className="setting-group">
                    <label className="setting-label">Display Mode</label>
                    <select className="setting-input" value={editingButton.display} onChange={e => updateButton(editingButton.id, { display: e.target.value as any })}>
                        <option value="floating">Floating Button</option>
                        <option value="inline">Inline Highlight</option>
                    </select>
                </div>
                {(editingButton.actionType === 'menu' || editingButton.longActionType === 'menu') && (
                    <div className="setting-group">
                        <label className="setting-label">Menu Display Style</label>
                        <select className="setting-input" value={editingButton.menuDisplay || 'list'} onChange={e => updateButton(editingButton.id, { menuDisplay: e.target.value as any })}>
                            <option value="list">List (Vertical)</option>
                            <option value="dial">Dial (Radial)</option>
                        </select>
                        <span className="setting-helper">Dial menus allow swiping around and firing on lift.</span>
                    </div>
                )}
            </>
        );
    }

    if (activeTab === 'gestures') {
        const directions: { id: SwipeDirection, label: string }[] = [
            { id: 'up', label: 'North' }, { id: 'down', label: 'South' },
            { id: 'left', label: 'West' }, { id: 'right', label: 'East' },
            { id: 'ne', label: 'NE' }, { id: 'nw', label: 'NW' },
            { id: 'se', label: 'SE' }, { id: 'sw', label: 'SW' }
        ];

        return (
            <>
                <ActionConfig label="Short Press Action" field="command" typeField="actionType" editingButton={editingButton} availableSets={availableSets} updateButton={updateButton} />
                <ActionConfig label="Long Press Action" field="longCommand" typeField="longActionType" editingButton={editingButton} availableSets={availableSets} updateButton={updateButton} />

                <div style={{ borderTop: '1px solid #333', paddingTop: '15px', marginTop: '15px' }}>
                    <label className="setting-label" style={{ marginBottom: '10px', display: 'block', color: 'var(--accent)' }}>Short Swipe Gestures</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        {directions.map(d => (
                            <div key={d.id} style={{ marginBottom: '10px' }}>
                                <label className="setting-label" style={{ fontSize: '0.75em', color: '#aaa', textTransform: 'uppercase' }}>{d.label}</label>
                                <SwipeConfig dir={d.id} editingButton={editingButton} availableSets={availableSets} updateButton={updateButton} />
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ borderTop: '1px solid #333', paddingTop: '15px', marginTop: '15px' }}>
                    <label className="setting-label" style={{ marginBottom: '10px', display: 'block', color: 'var(--accent)' }}>Long Swipe Gestures</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        {directions.map(d => (
                            <div key={d.id} style={{ marginBottom: '10px' }}>
                                <label className="setting-label" style={{ fontSize: '0.75em', color: '#aaa', textTransform: 'uppercase' }}>{d.label}</label>
                                <SwipeConfig dir={d.id} editingButton={editingButton} availableSets={availableSets} updateButton={updateButton} isLongSwipe />
                            </div>
                        ))}
                    </div>
                </div>
            </>
        );
    }

    if (activeTab === 'style') {
        const style = editingButton.style;
        return (
            <>
                <div className="setting-group">
                    <label className="setting-label">Background Color</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input type="color" className="setting-input" style={{ height: '40px', width: '60px', padding: 0 }} value={style.backgroundColor} onChange={e => updateButton(editingButton.id, { style: { ...style, backgroundColor: e.target.value } })} />
                        <input className="setting-input" value={style.backgroundColor} onChange={e => updateButton(editingButton.id, { style: { ...style, backgroundColor: e.target.value } })} />
                    </div>
                </div>
                <div className="setting-group">
                    <label className="setting-label">Border Color</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input type="color" className="setting-input" style={{ height: '40px', width: '60px', padding: 0 }} value={style.borderColor || '#ffffff'} onChange={e => updateButton(editingButton.id, { style: { ...style, borderColor: e.target.value } })} />
                        <input className="setting-input" value={style.borderColor || '#ffffff'} onChange={e => updateButton(editingButton.id, { style: { ...style, borderColor: e.target.value } })} />
                    </div>
                </div>
                <div className="setting-group">
                    <label className="setting-label">Border Width (px)</label>
                    <input type="number" className="setting-input" value={style.borderWidth || 1} onChange={e => updateButton(editingButton.id, { style: { ...style, borderWidth: parseInt(e.target.value) || 0 } })} />
                </div>
                <div className="setting-group">
                    <label className="setting-label">Shape</label>
                    <select className="setting-input" value={style.shape} onChange={e => updateButton(editingButton.id, { style: { ...style, shape: e.target.value as any } })}>
                        <option value="rect">Rectangle</option>
                        <option value="pill">Pill</option>
                        <option value="circle">Circle</option>
                    </select>
                </div>
                <div className="setting-group">
                    <label className="setting-label">Button Icon</label>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <input type="text" className="setting-input" placeholder="Image URL..." value={editingButton.icon || ''} onChange={e => updateButton(editingButton.id, { icon: e.target.value })} />
                        {editingButton.icon && <button className="btn-secondary" style={{ marginTop: 0, width: 'auto', padding: '0 10px' }} onClick={() => updateButton(editingButton.id, { icon: undefined })}>Clear</button>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label className="btn-secondary" style={{ marginTop: 0, cursor: 'pointer', flex: 1 }}>
                            Upload Image
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const file = e.target.files?.[0]; if (file) handleImageUpload(file); }} />
                        </label>
                        {editingButton.icon && (
                            <div style={{ width: '40px', height: '40px', borderRadius: '4px', background: '#222', border: '1px solid #444', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                <img src={editingButton.icon} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                            </div>
                        )}
                    </div>
                    {editingButton.icon && (
                        <div className="setting-group" style={{ marginTop: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <label className="setting-label">Icon Scale</label>
                                <span style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>{(style.iconScale || 1).toFixed(1)}x</span>
                            </div>
                            <input type="range" min="0.2" max="3.0" step="0.1" value={style.iconScale || 1} onChange={e => updateButton(editingButton.id, { style: { ...style, iconScale: parseFloat(e.target.value) } })} style={{ width: '100%' }} />
                        </div>
                    )}
                </div>
                <div className="setting-group" style={{ display: 'flex', gap: '20px' }}>
                    <label className="setting-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={style.transparent} onChange={e => updateButton(editingButton.id, { style: { ...style, transparent: e.target.checked } })} />
                        Transparent
                    </label>
                    {style.shape === 'circle' && (
                        <label className="setting-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={style.curvedText} onChange={e => updateButton(editingButton.id, { style: { ...style, curvedText: e.target.checked } })} />
                            Curved Text
                        </label>
                    )}
                </div>
            </>
        );
    }

    if (activeTab === 'triggers') {
        const trigger = editingButton.trigger;
        return (
            <>
                <div className="setting-group">
                    <label className="setting-label">Match Text (Pattern)</label>
                    <input className="setting-input" placeholder="Text to match..." value={trigger?.pattern || ''} onChange={e => updateButton(editingButton.id, { trigger: { ...trigger!, pattern: e.target.value } })} />
                </div>
                <div className="setting-group" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <label className="setting-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={trigger?.enabled} onChange={e => updateButton(editingButton.id, { trigger: { ...trigger!, enabled: e.target.checked } })} />
                        Enable Trigger
                    </label>
                    <label className="setting-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={trigger?.isRegex} onChange={e => updateButton(editingButton.id, { trigger: { ...trigger!, isRegex: e.target.checked } })} />
                        Use Regex
                    </label>
                </div>
                <div className="setting-group" style={{ marginTop: '10px' }}>
                    <label className="setting-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={trigger?.autoHide} onChange={e => updateButton(editingButton.id, { trigger: { ...trigger!, autoHide: e.target.checked } })} />
                        Hide Button on Click
                    </label>
                    <label className="setting-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={trigger?.spit} onChange={e => updateButton(editingButton.id, { trigger: { ...trigger!, spit: e.target.checked } })} />
                        Spit Animation
                    </label>
                    <label className="setting-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={trigger?.onKeyboard} onChange={e => updateButton(editingButton.id, { trigger: { ...trigger!, onKeyboard: e.target.checked } })} />
                        Show on Keyboard (Mobile)
                    </label>
                    {trigger?.onKeyboard && (
                        <label className="setting-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={trigger?.closeKeyboard} onChange={e => updateButton(editingButton.id, { trigger: { ...trigger!, closeKeyboard: e.target.checked } })} />
                            Close Keyboard on Tap
                        </label>
                    )}
                </div>
                <div className="setting-group">
                    <label className="setting-label">Auto-Hide Timer (seconds)</label>
                    <input type="number" className="setting-input" value={trigger?.duration || 0} onChange={e => updateButton(editingButton.id, { trigger: { ...trigger!, duration: parseInt(e.target.value) || 0 } })} />
                </div>
            </>
        );
    }

    if (activeTab === 'requirements') {
        const req = editingButton.requirement;
        return (
            <>
                <div className="setting-group">
                    <label className="setting-label">Required Ability (Skill/Spell)</label>
                    <input className="setting-input" placeholder="e.g. bash, fireball" value={req?.ability || ''} onChange={e => updateButton(editingButton.id, { requirement: { ...(req || {}), ability: e.target.value } })} />
                </div>
                <div className="setting-group">
                    <label className="setting-label">Minimum Proficiency (%)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input type="range" min="0" max="100" step="5" className="setting-input" style={{ flex: 1 }} value={req?.minProficiency || 0} onChange={e => updateButton(editingButton.id, { requirement: { ...(req || {}), minProficiency: parseInt(e.target.value) } })} />
                        <span style={{ width: '40px', textAlign: 'right', color: '#fff' }}>{req?.minProficiency || 0}%</span>
                    </div>
                </div>
                <div className="setting-group">
                    <label className="setting-label">Allowed Character Classes</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {['ranger', 'warrior', 'mage', 'cleric', 'thief'].map(cls => (
                            <label key={cls} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: '#fff' }}>
                                <input type="checkbox" checked={req?.characterClass?.includes(cls as any) || false} onChange={e => {
                                    const next = e.target.checked ? [...(req?.characterClass || []), cls] : (req?.characterClass || []).filter(c => c !== cls);
                                    updateButton(editingButton.id, { requirement: { ...(req || {}), characterClass: next as any } });
                                }} />
                                {cls.charAt(0).toUpperCase() + cls.slice(1)}
                            </label>
                        ))}
                    </div>
                </div>
                <div className="setting-group" style={{ borderTop: '1px solid #333', paddingTop: '15px' }}>
                    <label className="setting-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--accent)' }}>
                        <input type="checkbox" checked={editingButton.hideIfUnknown !== false} onChange={e => updateButton(editingButton.id, { hideIfUnknown: e.target.checked })} />
                        Hide if Unknown
                    </label>
                </div>
            </>
        );
    }

    return null;
};

export default ButtonForm;
