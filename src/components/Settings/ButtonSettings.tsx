import React, { useState, useRef, useEffect } from 'react';
import { Settings2, Plus, Grid, Layout, Tag, Layers, Check, ChevronDown } from 'lucide-react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { CategoryOverride, EntityKind } from '../../types';
import CategoryTraitCards from './CategoryTraitCards';
import TraitSettings from './TraitSettings';
import { getCategoryColorWithOverrides, toCategoryId } from '../../utils/inlineActionModel';
import { fromThemeLinkedColorInput, LinkedColorTheme, toColorInputHex, toThemeLinkedColor } from '../../utils/themeLinkedColors';

interface ButtonSettingsProps {
    isEditMode: boolean;
    setIsEditMode: (val: boolean) => void;
    isGridEnabled: boolean;
    setIsGridEnabled: (val: boolean) => void;
    createButton: () => void;
    setIsSetManagerOpen: (val: boolean) => void;
    activeSet: string;
    availableSets: string[];
    setActiveSet: (set: string) => void;
}

const getCategoryColor = (id: string, configs: CategoryOverride[], fallback: string, theme: LinkedColorTheme): string =>
    getCategoryColorWithOverrides(id, configs, fallback, {}, theme);

const setCategoryColor = (
    id: string,
    kind: EntityKind,
    color: string,
    setCategoryOverrides: (val: CategoryOverride[] | ((prev: CategoryOverride[]) => CategoryOverride[])) => void,
    theme: LinkedColorTheme
) => {
    const storedColor = fromThemeLinkedColorInput(color, theme);
    setCategoryOverrides(prev => {
        const overrides = Array.isArray(prev) ? prev : [];
        const categoryId = toCategoryId(id) || id;
        const existing = overrides.find(config => (toCategoryId(config.id) || config.id) === categoryId);
        const override: CategoryOverride = {
            ...(existing || { id: categoryId, kind }),
            color: storedColor
        };

        return existing
            ? overrides.map(config => config === existing ? override : config)
            : [...overrides, override];
    });
};

const ButtonSettings: React.FC<ButtonSettingsProps> = ({
    isEditMode,
    setIsEditMode,
    isGridEnabled,
    setIsGridEnabled,
    createButton,
    setIsSetManagerOpen,
    activeSet,
    availableSets,
    setActiveSet,
}) => {
    const {
        playerColor, setPlayerColor,
        npcColor, setNpcColor,
        objectColor,
        enemyColor, setEnemyColor,
        neutralColor, setNeutralColor,
        targetColor, setTargetColor,
        roomColor, setRoomColor,
        theme,
        categoryOverrides, setCategoryOverrides,
        customTraits, setCustomTraits,
    } = useSettingsStore();

    const [isSetDropdownOpen, setIsSetDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsSetDropdownOpen(false);
            }
        };
        if (isSetDropdownOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isSetDropdownOpen]);

    const displayColor = (color: string, fallback = '#ffffff') => (
        toColorInputHex(toThemeLinkedColor(color, theme), fallback)
    );
    const storeInputColor = (color: string) => fromThemeLinkedColorInput(color, theme);

    return (
        <div className="settings-section">
            {/* --- Button & UI Layout --- */}
            <h3 className="settings-section-title">
                <Layout size={18} /> Button &amp; UI Layout
            </h3>

            {/* Active Button Set */}
            <div className="setting-group" style={{ border: '1px solid var(--border-modal)', padding: '15px', borderRadius: '8px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <label className="setting-label" style={{ color: 'var(--accent)', fontWeight: 'bold', margin: 0 }}>Active Button Set</label>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                            Select which button set is active on your HUD.
                        </div>
                    </div>
                    <button
                        className="btn-secondary"
                        onClick={() => setIsSetManagerOpen(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', whiteSpace: 'nowrap' }}
                    >
                        <Settings2 size={16} /> Manage Sets
                    </button>
                </div>
                <div ref={dropdownRef} style={{ position: 'relative', marginTop: '12px' }}>
                    <div
                        onClick={() => setIsSetDropdownOpen(o => !o)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '8px 12px', borderRadius: '6px', cursor: 'pointer',
                            border: '1px solid var(--accent)',
                            background: 'rgba(var(--accent-rgb, 244,143,60), 0.08)',
                            userSelect: 'none'
                        }}
                    >
                        <Layers size={14} color="var(--accent)" />
                        <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 600 }}>{activeSet}</span>
                        <ChevronDown size={14} style={{ opacity: 0.6, transition: 'transform 0.2s', transform: isSetDropdownOpen ? 'rotate(180deg)' : 'none' }} />
                    </div>
                    {isSetDropdownOpen && (
                        <div style={{
                            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
                            background: 'var(--bg-panel)', border: '1px solid var(--border-modal)',
                            borderRadius: '6px', overflow: 'hidden',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                            maxHeight: '220px', overflowY: 'auto'
                        }}>
                            {availableSets.map(set => (
                                <div
                                    key={set}
                                    onClick={() => { setActiveSet(set); setIsSetDropdownOpen(false); }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        padding: '9px 12px', cursor: 'pointer',
                                        background: activeSet === set ? 'rgba(var(--accent-rgb, 244,143,60), 0.1)' : 'transparent',
                                        borderBottom: '1px solid var(--border-modal)'
                                    }}
                                >
                                    <Layers size={13} style={{ opacity: activeSet === set ? 1 : 0.35, color: activeSet === set ? 'var(--accent)' : undefined }} />
                                    <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: activeSet === set ? 600 : 400 }}>{set}</span>
                                    {activeSet === set && <Check size={13} color="var(--accent)" />}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Design Mode */}
            <div className="setting-group" style={{ border: '1px solid var(--border-modal)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isEditMode ? '15px' : 0 }}>
                    <div>
                        <label className="setting-label" style={{ color: 'var(--accent)', fontWeight: 'bold', margin: 0 }}>Design Mode</label>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                            Enable to drag, resize, and customize your HUD buttons.
                        </div>
                    </div>
                    <div
                        className={`setting-toggle ${isEditMode ? 'active' : ''}`}
                        onClick={() => setIsEditMode(!isEditMode)}
                        style={{ height: '24px', width: '45px', position: 'relative', border: 'none', backgroundColor: isEditMode ? 'var(--accent)' : 'var(--input-bg)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s' }}
                    >
                        <div style={{ width: '20px', height: '20px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '2px', left: isEditMode ? '22px' : '2px', transition: 'all 0.3s' }} />
                    </div>
                </div>

                {isEditMode && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '15px', borderTop: '1px solid var(--border-modal)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Grid size={16} color="var(--text-dim)" />
                                <span style={{ fontSize: '0.85rem' }}>Snap to Grid</span>
                            </div>
                            <div
                                className={`setting-toggle ${isGridEnabled ? 'active' : ''}`}
                                onClick={() => setIsGridEnabled(!isGridEnabled)}
                                style={{ height: '20px', width: '38px', position: 'relative', border: 'none', backgroundColor: isGridEnabled ? 'var(--accent)' : 'var(--input-bg)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.3s' }}
                            >
                                <div style={{ width: '16px', height: '16px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '2px', left: isGridEnabled ? '20px' : '2px', transition: 'all 0.3s' }} />
                            </div>
                        </div>

                        <button
                            className="btn-secondary"
                            onClick={createButton}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px', marginTop: '4px' }}
                        >
                            <Plus size={16} /> New Button
                        </button>
                    </div>
                )}

                {!isEditMode && (
                    <div style={{ marginTop: '12px', textAlign: 'center', borderTop: '1px solid var(--border-modal)', paddingTop: '12px' }}>
                        <button className="btn-secondary" onClick={() => setIsEditMode(true)}>Enable Design Mode</button>
                    </div>
                )}
            </div>

            {/* --- Categories & Colors --- */}
            <h3 className="settings-section-title" style={{ marginTop: '8px' }}>
                <Layout size={18} /> Categories &amp; Colors
            </h3>

            <div className="setting-group" style={{ border: '1px solid var(--border-modal)', background: 'var(--bg-panel)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                            <input type="color" value={displayColor(playerColor)} onChange={(e) => setPlayerColor(storeInputColor(e.target.value))} style={{ width: '20px', height: '20px', flexShrink: 0, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Ally (Room)</div>
                        </div>
                        <div style={{ fontSize: '0.65rem', opacity: 0.6, marginBottom: '4px' }}>GMCP room players</div>
                        <CategoryTraitCards categoryId="cat-ally" kind="player" categoryOverrides={categoryOverrides} setCategoryOverrides={setCategoryOverrides} customTraits={customTraits} setCustomTraits={setCustomTraits} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                            <input type="color" value={toColorInputHex(getCategoryColor('cat-ally-remote', categoryOverrides, playerColor, theme))} onChange={(e) => setCategoryColor('cat-ally-remote', 'player', e.target.value, setCategoryOverrides, theme)} style={{ width: '20px', height: '20px', flexShrink: 0, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Ally (Who)</div>
                        </div>
                        <div style={{ fontSize: '0.65rem', opacity: 0.6, marginBottom: '4px' }}>Who-list players</div>
                        <CategoryTraitCards categoryId="cat-ally-remote" kind="player" categoryOverrides={categoryOverrides} setCategoryOverrides={setCategoryOverrides} customTraits={customTraits} setCustomTraits={setCustomTraits} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                            <input type="color" value={displayColor(enemyColor)} onChange={(e) => setEnemyColor(storeInputColor(e.target.value))} style={{ width: '20px', height: '20px', flexShrink: 0, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Enemy</div>
                        </div>
                        <div style={{ fontSize: '0.65rem', opacity: 0.6, marginBottom: '4px' }}>Inline menus &amp; logs</div>
                        <CategoryTraitCards categoryId="cat-enemy" kind="player" categoryOverrides={categoryOverrides} setCategoryOverrides={setCategoryOverrides} customTraits={customTraits} setCustomTraits={setCustomTraits} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                            <input type="color" value={displayColor(neutralColor)} onChange={(e) => setNeutralColor(storeInputColor(e.target.value))} style={{ width: '20px', height: '20px', flexShrink: 0, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Neutral</div>
                        </div>
                        <div style={{ fontSize: '0.65rem', opacity: 0.6, marginBottom: '4px' }}>Inline menus &amp; logs</div>
                        <CategoryTraitCards categoryId="cat-neutral" kind="player" categoryOverrides={categoryOverrides} setCategoryOverrides={setCategoryOverrides} customTraits={customTraits} setCustomTraits={setCustomTraits} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                            <input type="color" value={displayColor(targetColor)} onChange={(e) => setTargetColor(storeInputColor(e.target.value))} style={{ width: '20px', height: '20px', flexShrink: 0, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Target</div>
                        </div>
                        <div style={{ fontSize: '0.65rem', opacity: 0.6, marginBottom: '4px' }}>Double-click menu</div>
                        <CategoryTraitCards categoryId="cat-target" kind="none" categoryOverrides={categoryOverrides} setCategoryOverrides={setCategoryOverrides} customTraits={customTraits} setCustomTraits={setCustomTraits} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                            <input type="color" value={displayColor(npcColor)} onChange={(e) => setNpcColor(storeInputColor(e.target.value))} style={{ width: '20px', height: '20px', flexShrink: 0, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>NPCs</div>
                        </div>
                        <div style={{ fontSize: '0.65rem', opacity: 0.6, marginBottom: '4px' }}>Inline menus &amp; logs</div>
                        <CategoryTraitCards categoryId="cat-npc" kind="npc" categoryOverrides={categoryOverrides} setCategoryOverrides={setCategoryOverrides} customTraits={customTraits} setCustomTraits={setCustomTraits} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                            <input type="color" value={toColorInputHex(getCategoryColor('cat-room-object', categoryOverrides, objectColor.startsWith('rgba') ? '#fb923c' : objectColor, theme))} onChange={(e) => setCategoryColor('cat-room-object', 'object', e.target.value, setCategoryOverrides, theme)} style={{ width: '20px', height: '20px', flexShrink: 0, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Object (Room)</div>
                        </div>
                        <div style={{ fontSize: '0.65rem', opacity: 0.6, marginBottom: '4px' }}>Items on the ground</div>
                        <CategoryTraitCards categoryId="cat-room-object" kind="object" categoryOverrides={categoryOverrides} setCategoryOverrides={setCategoryOverrides} customTraits={customTraits} setCustomTraits={setCustomTraits} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                            <input type="color" value={toColorInputHex(getCategoryColor('cat-inventory-object', categoryOverrides, objectColor.startsWith('rgba') ? '#fb923c' : objectColor, theme))} onChange={(e) => setCategoryColor('cat-inventory-object', 'object', e.target.value, setCategoryOverrides, theme)} style={{ width: '20px', height: '20px', flexShrink: 0, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Object (Carried)</div>
                        </div>
                        <div style={{ fontSize: '0.65rem', opacity: 0.6, marginBottom: '4px' }}>Inventory items</div>
                        <CategoryTraitCards categoryId="cat-inventory-object" kind="object" categoryOverrides={categoryOverrides} setCategoryOverrides={setCategoryOverrides} customTraits={customTraits} setCustomTraits={setCustomTraits} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                            <input type="color" value={toColorInputHex(getCategoryColor('cat-worn-object', categoryOverrides, objectColor.startsWith('rgba') ? '#fb923c' : objectColor, theme))} onChange={(e) => setCategoryColor('cat-worn-object', 'object', e.target.value, setCategoryOverrides, theme)} style={{ width: '20px', height: '20px', flexShrink: 0, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Object (Worn)</div>
                        </div>
                        <div style={{ fontSize: '0.65rem', opacity: 0.6, marginBottom: '4px' }}>Equipped items</div>
                        <CategoryTraitCards categoryId="cat-worn-object" kind="object" categoryOverrides={categoryOverrides} setCategoryOverrides={setCategoryOverrides} customTraits={customTraits} setCustomTraits={setCustomTraits} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                            <input type="color" value={toColorInputHex(getCategoryColor('cat-container-item', categoryOverrides, objectColor.startsWith('rgba') ? '#fb923c' : objectColor, theme))} onChange={(e) => setCategoryColor('cat-container-item', 'object', e.target.value, setCategoryOverrides, theme)} style={{ width: '20px', height: '20px', flexShrink: 0, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Object (Container)</div>
                        </div>
                        <div style={{ fontSize: '0.65rem', opacity: 0.6, marginBottom: '4px' }}>Container items</div>
                        <CategoryTraitCards categoryId="cat-container-item" kind="object" categoryOverrides={categoryOverrides} setCategoryOverrides={setCategoryOverrides} customTraits={customTraits} setCustomTraits={setCustomTraits} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                            <input type="color" value={displayColor(roomColor)} onChange={(e) => setRoomColor(storeInputColor(e.target.value))} style={{ width: '20px', height: '20px', flexShrink: 0, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Room Names</div>
                        </div>
                        <div style={{ fontSize: '0.65rem', opacity: 0.6, marginBottom: '4px' }}>Watch/camp actions, never tactical targets</div>
                        <CategoryTraitCards categoryId="cat-room" kind="room" categoryOverrides={categoryOverrides} setCategoryOverrides={setCategoryOverrides} customTraits={customTraits} setCustomTraits={setCustomTraits} />
                    </div>
                </div>
            </div>

            {/* --- Traits --- */}
            <h3 className="settings-section-title" style={{ marginTop: '8px' }}>
                <Tag size={18} /> Traits
            </h3>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '12px' }}>
                Traits define which action buttons appear when you tap an inline entity. Keywords control which traits auto-apply based on the entity name.
            </div>

            <TraitSettings
                customTraits={customTraits}
                setCustomTraits={setCustomTraits}
            />
        </div>
    );
};

export default ButtonSettings;
