/**
 * @file CombatSliderPopout.tsx
 * @description Enhanced vertical pop-out slider with tick marks and labels for combat settings.
 */

import React from 'react';

interface CombatSliderPopoutProps {
    label: string;
    value: string;
    options: string[];
    onSelect: (val: string, index: number) => void;
    onClose: () => void;
    triggerHaptic: (intensity: number) => void;
}

export const CombatSliderPopout: React.FC<CombatSliderPopoutProps> = ({
    label,
    value,
    options,
    onSelect,
    onClose,
    triggerHaptic
}) => {
    const currentIndex = options.indexOf(value.toLowerCase());

    return (
        <>
            {/* Transparent backdrop to close when clicking outside */}
            <div 
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, background: 'transparent' }}
                onClick={(e) => { e.stopPropagation(); onClose(); }}
            />
            
            <div 
                style={{ 
                    position: 'absolute', 
                    bottom: '120%', 
                    left: '50%', 
                    transform: 'translateX(-50%)', 
                    background: 'rgba(20, 24, 35, 0.98)', 
                    border: '1px solid rgba(255,255,255,0.2)', 
                    padding: '20px 15px', 
                    borderRadius: '20px', 
                    backdropFilter: 'blur(12px)', 
                    boxShadow: '0 15px 35px rgba(0,0,0,0.6)', 
                    zIndex: 1001, 
                    display: 'flex', 
                    flexDirection: 'row', 
                    alignItems: 'stretch', 
                    height: '200px',
                    width: '160px',
                    gap: '12px'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Vertical Slider */}
                <div style={{ position: 'relative', width: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <input 
                        type="range"
                        min="0" max={options.length - 1} step="1"
                        value={currentIndex}
                        onChange={(e) => {
                            const idx = parseInt(e.target.value);
                            onSelect(options[idx], idx);
                        }}
                        style={{ 
                            writingMode: 'vertical-lr' as any, 
                            direction: 'rtl', 
                            height: '100%', 
                            width: '28px', 
                            cursor: 'grab',
                            margin: 0
                        }}
                    />
                </div>

                {/* Labels Column */}
                <div style={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'space-between', 
                    padding: '4px 0',
                    pointerEvents: 'auto'
                }}>
                    {[...options].reverse().map((opt, idx) => {
                        const realIdx = options.length - 1 - idx;
                        const isActive = realIdx === currentIndex;
                        return (
                            <div 
                                key={opt}
                                onClick={() => onSelect(opt, realIdx)}
                                style={{ 
                                    fontSize: '0.58rem', 
                                    color: isActive ? 'var(--accent)' : 'rgba(255,255,255,0.5)', 
                                    fontWeight: isActive ? 900 : 700,
                                    textTransform: 'uppercase',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <div style={{ 
                                    width: '4px', 
                                    height: '4px', 
                                    borderRadius: '50%', 
                                    background: isActive ? 'var(--accent)' : 'rgba(255,255,255,0.2)' 
                                }} />
                                {opt}
                            </div>
                        );
                    })}
                </div>

                {/* Header Label at top */}
                <div style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--accent)',
                    color: '#000',
                    fontSize: '0.5rem',
                    fontWeight: 900,
                    padding: '2px 10px',
                    borderRadius: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
                }}>
                    {label}
                </div>
            </div>
        </>
    );
};
