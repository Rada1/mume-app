/**
 * @file DrawerTabBar.tsx
 * @description Shared tab bar for drawer sections.
 */

import React from 'react';

interface DrawerTab {
    id: string;
    label: string;
}

interface DrawerTabBarProps {
    tabs: DrawerTab[];
    active: string;
    onChange: (id: string) => void;
}

// --- Logic Section ---

export const DrawerTabBar: React.FC<DrawerTabBarProps> = ({ tabs, active, onChange }) => (
    <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.02)',
        padding: '0 8px',
        flexShrink: 0
    }}>
        {tabs.map(tab => (
            <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                style={{
                    flex: 1,
                    padding: '8px 4px',
                    background: 'none',
                    border: 'none',
                    borderBottom: `2px solid ${active === tab.id ? 'var(--accent)' : 'transparent'}`,
                    color: active === tab.id ? 'var(--accent)' : 'rgba(255,255,255,0.4)',
                    fontSize: '0.65em',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    marginBottom: '-1px'
                }}
            >
                {tab.label}
            </button>
        ))}
    </div>
);
