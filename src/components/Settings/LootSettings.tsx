/** @file LootSettings.tsx — User controls for optional automatic valuable looting. */
import React from 'react';
import { Coins } from 'lucide-react';
import { useSettingsStore } from '../../stores/useSettingsStore';

// --- Logic Section ---
export const LootSettings: React.FC = () => {
    const autoLootValuables = useSettingsStore(state => state.autoLootValuables);
    const setAutoLootValuables = useSettingsStore(state => state.setAutoLootValuables);

    return (
        <section className="setting-group" style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
            padding: '14px', marginBottom: '16px', border: '1px solid var(--border-modal)', borderRadius: '8px'
        }}>
            <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <Coins size={15} aria-hidden="true" />
                    <label className="setting-label" style={{ margin: 0, fontWeight: 700 }}>Automatically loot valuables</label>
                </div>
                <p style={{ margin: '5px 0 0', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                    After combat ends, examine room corpses and transfer valuable metals, mail, and treasure to your mount.
                    A mount must be present.
                </p>
            </div>
            <button
                type="button"
                className={`setting-toggle${autoLootValuables ? ' active' : ''}`}
                aria-label="Automatically loot valuables"
                aria-pressed={autoLootValuables}
                onClick={() => setAutoLootValuables(!autoLootValuables)}
                style={{
                    height: '24px', width: '45px', flex: '0 0 45px', position: 'relative', border: 'none',
                    backgroundColor: autoLootValuables ? 'var(--accent)' : 'var(--input-bg)', borderRadius: '12px', cursor: 'pointer'
                }}
            >
                <span style={{
                    width: '20px', height: '20px', position: 'absolute', top: '2px',
                    left: autoLootValuables ? '22px' : '2px', borderRadius: '50%', background: '#fff'
                }} />
            </button>
        </section>
    );
};
