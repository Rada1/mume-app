/**
 * @file SettingHelpers.tsx
 * @description Shared UI helper components for settings panels.
 */

import React from 'react';

export const ToggleRow: React.FC<{
    label: string;
    description: string;
    value: boolean;
    onToggle: () => void;
    badge?: string;
    first?: boolean;
}> = ({ label, description, value, onToggle, badge, first }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', ...(first ? {} : { marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-modal)' }) }}>
        <div style={{ flex: '1 1 200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label className="setting-label" style={{ color: 'var(--text-primary)', margin: 0 }}>{label}</label>
                {badge && <span style={{ fontSize: '0.65rem', background: 'var(--accent)', color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', letterSpacing: '0.5px' }}>{badge}</span>}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>{description}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: value ? 'var(--accent)' : '#64748b' }}>{value ? 'ON' : 'OFF'}</span>
            <button
                className={`setting-toggle ${value ? 'active' : ''}`}
                onClick={onToggle}
                style={{ height: '24px', width: '45px', position: 'relative', border: 'none', backgroundColor: value ? 'var(--accent)' : 'var(--input-bg)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s' }}
            >
                <div style={{ width: '20px', height: '20px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '2px', left: value ? '22px' : '2px', transition: 'all 0.3s' }} />
            </button>
        </div>
    </div>
);
