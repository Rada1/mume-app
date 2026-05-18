/**
 * @file CombatSliderPopout.tsx
 * @description Enhanced vertical pop-out slider with tick marks and labels for combat settings.
 */

import React from 'react';
import ReactDOM from 'react-dom';

interface CombatSliderPopoutProps {
    label: string;
    value: string;
    options: string[];
    anchorRect: DOMRect;
    onSelect: (val: string, index: number) => void;
    onClose: () => void;
    triggerHaptic: (intensity: number) => void;
    race?: string;
    subrace?: string;
    onFormSelect?: (newForm: 'human' | 'bear') => void;
}

export const CombatSliderPopout: React.FC<CombatSliderPopoutProps> = ({
    label,
    value,
    options,
    anchorRect,
    onSelect,
    onClose,
    triggerHaptic,
    race,
    subrace,
    onFormSelect
}) => {
    const currentIndex = options.indexOf(value.toLowerCase());
    const isBeorningOrBear = ['beorning', 'bear'].includes(race?.toLowerCase() || '') || ['beorning', 'bear'].includes(subrace?.toLowerCase() || '');
    const currentForm = (race?.toLowerCase() === 'bear' || subrace?.toLowerCase() === 'bear') ? 'bear' : 'human';
    const formValue = currentForm === 'bear' ? 1 : 0;

    return ReactDOM.createPortal(
        <>
            <div className="disposition-popout-backdrop" onClick={(e) => { e.stopPropagation(); onClose(); }} />
            <div
                className={`disposition-popout ${isBeorningOrBear ? 'combat-form-popout' : 'combat-position-popout'}`}
                style={{
                    bottom: (window.innerHeight - anchorRect.top) + 12,
                    left: anchorRect.left + (anchorRect.width / 2),
                    width: isBeorningOrBear ? '180px' : '128px',
                    gridTemplateColumns: isBeorningOrBear ? 'repeat(2, minmax(0, 1fr))' : '1fr',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="disposition-popout-title">{isBeorningOrBear ? 'POSITION / FORM' : label}</div>
                
                <div className="disposition-slider-column">
                    <div className="disposition-slider-label">POS</div>
                    <input
                        className="disposition-slider"
                        type="range"
                        min="0"
                        max={options.length - 1}
                        step="1"
                        value={currentIndex}
                        onChange={(e) => {
                            const idx = Number(e.target.value);
                            onSelect(options[idx], idx);
                        }}
                        aria-label="Position"
                    />
                    <div className="disposition-slider-options">
                        {[...options].reverse().map((opt, reverseIndex) => {
                            const realIndex = options.length - 1 - reverseIndex;
                            const isActive = realIndex === currentIndex;
                            return (
                                <button
                                    key={opt}
                                    className={`disposition-option${isActive ? ' active' : ''}`}
                                    onClick={() => onSelect(opt, realIndex)}
                                >
                                    {opt}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {isBeorningOrBear && (
                    <div className="disposition-slider-column">
                        <div className="disposition-slider-label">FORM</div>
                        <input
                            className="disposition-slider"
                            type="range"
                            min="0"
                            max="1"
                            step="1"
                            value={formValue}
                            onChange={(e) => {
                                const idx = Number(e.target.value);
                                const newForm = idx === 1 ? 'bear' : 'human';
                                onFormSelect?.(newForm);
                            }}
                            style={{ accentColor: currentForm === 'bear' ? '#fb923c' : '#38bdf8' }}
                            aria-label="Form"
                        />
                        <div className="disposition-slider-options">
                            {['bear', 'human'].map((opt) => {
                                const isBearOpt = opt === 'bear';
                                const isActive = currentForm === opt;
                                const accentColor = isBearOpt ? '#fb923c' : '#38bdf8';
                                return (
                                    <button
                                        key={opt}
                                        className={`disposition-option${isActive ? ' active' : ''}`}
                                        style={isActive ? { color: accentColor, textShadow: `0 0 8px ${accentColor}59` } : {}}
                                        onClick={() => onFormSelect?.(opt as 'human' | 'bear')}
                                    >
                                        {isBearOpt ? '🐾 BEAR' : '👤 HUMAN'}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </>,
        document.body
    );
};
