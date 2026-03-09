import React from 'react';

interface ToggleSwitchProps {
    label: string;
    description: string;
    checked: boolean;
    onChange: () => void;
    color: string;
    activeText?: string;
    inactiveText?: string;
    badge?: string;
    badgeColor?: string;
    badgeTextColor?: string;
    containerStyle?: React.CSSProperties;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
    label,
    description,
    checked,
    onChange,
    color,
    activeText = 'ON',
    inactiveText = 'OFF',
    badge,
    badgeColor,
    badgeTextColor = '#fff',
    containerStyle
}) => {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', ...containerStyle }}>
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label className="setting-label" style={{ color: checked ? color : 'var(--text-primary)', fontWeight: 'bold', margin: 0 }}>
                        {label}
                    </label>
                    {badge && (
                        <span style={{ fontSize: '0.65rem', background: badgeColor, color: badgeTextColor, padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                            {badge}
                        </span>
                    )}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>{description}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: checked ? color : '#64748b' }}>
                    {checked ? activeText : inactiveText}
                </span>
                <div
                    onClick={onChange}
                    style={{
                        width: '40px',
                        height: '20px',
                        background: checked ? color : '#334155',
                        borderRadius: '20px',
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'all 0.3s'
                    }}
                >
                    <div style={{
                        width: '16px',
                        height: '16px',
                        background: '#fff',
                        borderRadius: '50%',
                        position: 'absolute',
                        top: '2px',
                        left: checked ? '22px' : '2px',
                        transition: 'all 0.3s'
                    }} />
                </div>
            </div>
        </div>
    );
};

export default ToggleSwitch;
