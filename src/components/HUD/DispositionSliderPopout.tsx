/**
 * @file DispositionSliderPopout.tsx
 * @description Three-slider prompt popout for mood, spell speed, and alertness.
 */

import React from 'react';
import ReactDOM from 'react-dom';

export interface DispositionSliderConfig {
    id: 'mood' | 'speed' | 'alert';
    label: string;
    value: string;
    options: string[];
    displayLabels: string[];
}

interface DispositionSliderPopoutProps {
    sliders: DispositionSliderConfig[];
    anchorRect: DOMRect;
    onSelect: (id: DispositionSliderConfig['id'], value: string, index: number) => void;
    onClose: () => void;
}

// --- Logic Section ---

const getIndex = (value: string, options: string[]) => {
    const normalized = value.toLowerCase();
    const exactIndex = options.indexOf(normalized);
    if (exactIndex >= 0) return exactIndex;
    const prefixIndex = options.findIndex(option => normalized.startsWith(option.slice(0, 3)));
    return Math.max(0, prefixIndex);
};

// --- Render Section ---

export const DispositionSliderPopout: React.FC<DispositionSliderPopoutProps> = ({
    sliders,
    anchorRect,
    onSelect,
    onClose
}) => ReactDOM.createPortal(
    <>
        <div className="disposition-popout-backdrop" onClick={(e) => { e.stopPropagation(); onClose(); }} />
        <div
            className="disposition-popout"
            style={{
                bottom: (window.innerHeight - anchorRect.top) + 12,
                left: anchorRect.left + (anchorRect.width / 2)
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="disposition-popout-title">Disposition</div>
            {sliders.map(slider => {
                const currentIndex = getIndex(slider.value, slider.options);
                return (
                    <div key={slider.id} className="disposition-slider-column">
                        <div className="disposition-slider-label">{slider.label}</div>
                        <input
                            className="disposition-slider"
                            type="range"
                            min="0"
                            max={slider.options.length - 1}
                            step="1"
                            value={currentIndex}
                            onChange={(e) => {
                                const index = Number(e.target.value);
                                onSelect(slider.id, slider.options[index], index);
                            }}
                            aria-label={slider.label}
                        />
                        <div className="disposition-slider-options">
                            {[...slider.displayLabels].reverse().map((displayLabel, reverseIndex) => {
                                const realIndex = slider.displayLabels.length - 1 - reverseIndex;
                                const isActive = realIndex === currentIndex;
                                return (
                                    <button
                                        key={displayLabel}
                                        className={`disposition-option${isActive ? ' active' : ''}`}
                                        onClick={() => onSelect(slider.id, slider.options[realIndex], realIndex)}
                                    >
                                        {displayLabel}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    </>,
    document.body
);
