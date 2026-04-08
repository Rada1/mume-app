import React from 'react';
import { CombatSliderPopout } from './CombatSliderPopout';

interface CombatSettingControlProps {
    id: string;
    label: string;
    value: string;
    options: string[];
    isActive: boolean;
    activeButtonRect: DOMRect | null;
    activeColor: string;
    inactiveColor?: string;
    onToggle: (e: React.MouseEvent<HTMLDivElement>) => void;
    onSelect: (val: string, idx: number) => void;
    onClose: () => void;
    triggerHaptic: (ms: number) => void;
    gridColumn: string;
    gridRow: string;
}

export const CombatSettingControl: React.FC<CombatSettingControlProps> = ({
    id,
    label,
    value,
    options,
    isActive,
    activeButtonRect,
    activeColor,
    inactiveColor = 'var(--accent)',
    onToggle,
    onSelect,
    onClose,
    triggerHaptic,
    gridColumn,
    gridRow
}) => {
    return (
        <div
            style={{
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.05)',
                padding: '1px 6px',
                borderRadius: '10px',
                textAlign: 'center',
                position: 'relative',
                zIndex: isActive ? 101 : 1,
                border: '1px solid rgba(255,255,255,0.05)',
                minHeight: '34px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gridColumn,
                gridRow,
                boxSizing: 'border-box'
            }}
            onClick={onToggle}
        >
            <div style={{ fontSize: 'var(--dynamic-log-size, 16px)', color: 'rgba(255,255,255,0.3)', fontWeight: 800, textTransform: 'uppercase', lineHeight: '1' }}>
                {label}
            </div>
            <div style={{
                fontSize: 'var(--dynamic-log-size, 16px)',
                color: value.toLowerCase() === activeColor.toLowerCase() || (id === 'pos' && value === 'standing') ? 'var(--accent)' : (id === 'pos' ? '#94a3b8' : (id === 'mood' && value === 'berserk' ? '#f87171' : (id === 'alert' && value === 'paranoid' ? '#fbbf24' : inactiveColor))),
                fontWeight: '900',
                letterSpacing: '0.3px',
                marginTop: '0px',
                lineHeight: '1'
            }}>
                {value.toUpperCase()}
            </div>

            {isActive && activeButtonRect && (
                <CombatSliderPopout
                    label={id === 'pos' ? 'POSITION' : (id === 'spell' ? 'SPELL SPEED' : id === 'alert' ? 'ALERTNESS' : 'SET MOOD')}
                    value={value}
                    options={options}
                    anchorRect={activeButtonRect}
                    onSelect={onSelect}
                    onClose={onClose}
                    triggerHaptic={triggerHaptic}
                />
            )}
        </div>
    );
};
