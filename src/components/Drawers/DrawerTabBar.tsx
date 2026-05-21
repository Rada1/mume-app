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
        borderBottom: '1px solid rgba(232, 176, 32, 0.18)',
        background: 'rgba(0, 0, 0, 0.15)',
        padding: '0',
        flexShrink: 0
    }}>
        {tabs.map(tab => {
            const isActive = active === tab.id;
            return (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    style={{
                        flex: 1,
                        padding: '9px 4px',
                        background: isActive ? 'rgba(232, 176, 32, 0.08)' : 'none',
                        border: 'none',
                        borderBottom: `2px solid ${isActive ? '#e8b020' : 'transparent'}`,
                        color: isActive ? '#e8b020' : 'rgba(220, 200, 160, 0.45)',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '1.2px',
                        cursor: 'pointer',
                        transition: 'color 0.15s, background 0.15s, border-color 0.15s',
                        marginBottom: '-1px',
                        textShadow: isActive ? '0 0 10px rgba(232, 176, 32, 0.55)' : 'none',
                    }}
                >
                    {tab.label}
                </button>
            );
        })}
    </div>
);
