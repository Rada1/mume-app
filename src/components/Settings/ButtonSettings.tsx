import React from 'react';
import { Settings2, Plus, Grid, Layout, Tag } from 'lucide-react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { CategoryOverride, EntityKind } from '../../types';
import CategoryTraitCards from './CategoryTraitCards';
import TraitSettings from './TraitSettings';
import { getCategoryColorWithOverrides, toCategoryId } from '../../utils/inlineActionModel';

interface ButtonSettingsProps {
    isEditMode: boolean;
    setIsEditMode: (val: boolean) => void;
    isGridEnabled: boolean;
    setIsGridEnabled: (val: boolean) => void;
    createButton: () => void;
    setIsSetManagerOpen: (val: boolean) => void;
}

const getCategoryColor = (id: string, configs: CategoryOverride[], fallback: string): string =>
    getCategoryColorWithOverrides(id, configs, fallback);

const setCategoryColor = (
    id: string,
    kind: EntityKind,
    color: string,
    setCategoryOverrides: (val: CategoryOverride[] | ((prev: CategoryOverride[]) => CategoryOverride[])) => void
) => {
    setCategoryOverrides(prev => {
        const overrides = Array.isArray(prev) ? prev : [];
        const categoryId = toCategoryId(id) || id;
        const existing = overrides.find(config => (toCategoryId(config.id) || config.id) === categoryId);
        const override: CategoryOverride = {
            ...(existing || { id: categoryId, kind }),
            color
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
    setIsSetManagerOpen
}) => {
    const {
        playerColor, setPlayerColor,
        npcColor, setNpcColor,
        objectColor,
        enemyColor, setEnemyColor,
        neutralColor, setNeutralColor,
        targetColor, setTargetColor,
        roomColor, setRoomColor,
        categoryOverrides, setCategoryOverrides,
        customTraits, setCustomTraits,
    } = useSettingsStore();

    return (
        <div className="settings-section">
            {/* --- Button & UI Layout --- */}
            <h3 className="settings-section-title">
                <Layout size={18} /> Button &amp; UI Layout
            </h3>

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

                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <button
                                className="btn-secondary"
                                onClick={createButton}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px' }}
                            >
                                <Plus size={16} /> New Button
                            </button>
                            <button
                                className="btn-secondary"
                                onClick={() => setIsSetManagerOpen(true)}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px' }}
                            >
                                <Settings2 size={16} /> Manage Sets
                            </button>
                        </div>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input type="color" value={playerColor} onChange={(e) => setPlayerColor(e.target.value)} style={{ width: '28px', height: '28px', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
                        <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Ally (Room)</div>
                            <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>GMCP room players</div>
                            <CategoryTraitCards categoryId="cat-ally" kind="player" categoryOverrides={categoryOverrides} setCategoryOverrides={setCategoryOverrides} customTraits={customTraits} setCustomTraits={setCustomTraits} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input type="color" value={getCategoryColor('cat-ally-remote', categoryOverrides, playerColor)} onChange={(e) => setCategoryColor('cat-ally-remote', 'player', e.target.value, setCategoryOverrides)} style={{ width: '28px', height: '28px', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
                        <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Ally (Who)</div>
                            <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>Who-list players</div>
                            <CategoryTraitCards categoryId="cat-ally-remote" kind="player" categoryOverrides={categoryOverrides} setCategoryOverrides={setCategoryOverrides} customTraits={customTraits} setCustomTraits={setCustomTraits} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input type="color" value={enemyColor} onChange={(e) => setEnemyColor(e.target.value)} style={{ width: '28px', height: '28px', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
                        <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Enemy</div>
                            <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>Inline menus &amp; logs</div>
                            <CategoryTraitCards categoryId="cat-enemy" kind="player" categoryOverrides={categoryOverrides} setCategoryOverrides={setCategoryOverrides} customTraits={customTraits} setCustomTraits={setCustomTraits} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input type="color" value={neutralColor} onChange={(e) => setNeutralColor(e.target.value)} style={{ width: '28px', height: '28px', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
                        <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Neutral</div>
                            <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>Inline menus &amp; logs</div>
                            <CategoryTraitCards categoryId="cat-neutral" kind="player" categoryOverrides={categoryOverrides} setCategoryOverrides={setCategoryOverrides} customTraits={customTraits} setCustomTraits={setCustomTraits} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input type="color" value={targetColor} onChange={(e) => setTargetColor(e.target.value)} style={{ width: '28px', height: '28px', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
                        <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Target</div>
                            <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>Double-click menu</div>
                            <CategoryTraitCards categoryId="cat-target" kind="none" categoryOverrides={categoryOverrides} setCategoryOverrides={setCategoryOverrides} customTraits={customTraits} setCustomTraits={setCustomTraits} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input type="color" value={npcColor} onChange={(e) => setNpcColor(e.target.value)} style={{ width: '28px', height: '28px', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
                        <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>NPCs</div>
                            <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>Inline menus &amp; logs</div>
                            <CategoryTraitCards categoryId="cat-npc" kind="npc" categoryOverrides={categoryOverrides} setCategoryOverrides={setCategoryOverrides} customTraits={customTraits} setCustomTraits={setCustomTraits} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input type="color" value={getCategoryColor('cat-room-object', categoryOverrides, objectColor.startsWith('rgba') ? '#fb923c' : objectColor)} onChange={(e) => setCategoryColor('cat-room-object', 'object', e.target.value, setCategoryOverrides)} style={{ width: '28px', height: '28px', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
                        <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Object (Room)</div>
                            <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>Items on the ground</div>
                            <CategoryTraitCards categoryId="cat-room-object" kind="object" categoryOverrides={categoryOverrides} setCategoryOverrides={setCategoryOverrides} customTraits={customTraits} setCustomTraits={setCustomTraits} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input type="color" value={getCategoryColor('cat-inventory-object', categoryOverrides, objectColor.startsWith('rgba') ? '#fb923c' : objectColor)} onChange={(e) => setCategoryColor('cat-inventory-object', 'object', e.target.value, setCategoryOverrides)} style={{ width: '28px', height: '28px', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
                        <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Object (Carried)</div>
                            <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>Inventory items</div>
                            <CategoryTraitCards categoryId="cat-inventory-object" kind="object" categoryOverrides={categoryOverrides} setCategoryOverrides={setCategoryOverrides} customTraits={customTraits} setCustomTraits={setCustomTraits} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input type="color" value={getCategoryColor('cat-worn-object', categoryOverrides, objectColor.startsWith('rgba') ? '#fb923c' : objectColor)} onChange={(e) => setCategoryColor('cat-worn-object', 'object', e.target.value, setCategoryOverrides)} style={{ width: '28px', height: '28px', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
                        <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Object (Worn)</div>
                            <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>Equipped items</div>
                            <CategoryTraitCards categoryId="cat-worn-object" kind="object" categoryOverrides={categoryOverrides} setCategoryOverrides={setCategoryOverrides} customTraits={customTraits} setCustomTraits={setCustomTraits} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input type="color" value={roomColor} onChange={(e) => setRoomColor(e.target.value)} style={{ width: '28px', height: '28px', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
                        <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Room Names</div>
                            <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>Watch/camp actions, never tactical targets</div>
                            <CategoryTraitCards categoryId="cat-room" kind="room" categoryOverrides={categoryOverrides} setCategoryOverrides={setCategoryOverrides} customTraits={customTraits} setCustomTraits={setCustomTraits} />
                        </div>
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
