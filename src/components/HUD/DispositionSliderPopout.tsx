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
    slider?: DispositionSliderConfig;
    sliders?: DispositionSliderConfig[];
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
    slider,
    sliders,
    anchorRect,
    onSelect,
    onClose
}) => {
    const visibleSliders = slider ? [slider] : (sliders || []);

    return ReactDOM.createPortal(
    <>
        <div className="disposition-popout-backdrop" onClick={(e) => { e.stopPropagation(); onClose(); }} />
        <div
            className={`disposition-popout${slider ? ' disposition-single-popout' : ''}`}
            style={{
                bottom: (window.innerHeight - anchorRect.top) + 12,
                left: anchorRect.left + (anchorRect.width / 2)
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="disposition-popout-title">{slider?.label || 'Disposition'}</div>
            {visibleSliders.map(activeSlider => {
                const currentIndex = getIndex(activeSlider.value, activeSlider.options);
                return (
                    <div key={activeSlider.id} className="disposition-slider-column has-codes">
                        <div className="disposition-slider-label">{activeSlider.label}</div>
                        <div className="disposition-slider-codes">
                            {[...activeSlider.options.keys()].reverse().map((realIndex) => (
                                <span
                                    key={realIndex}
                                    className={realIndex === currentIndex ? 'active' : ''}
                                >
                                    {realIndex + 1}
                                </span>
                            ))}
                        </div>
                        <input
                            className="disposition-slider"
                            type="range"
                            min="0"
                            max={activeSlider.options.length - 1}
                            step="1"
                            value={currentIndex}
                            onChange={(e) => {
                                const index = Number(e.target.value);
                                onSelect(activeSlider.id, activeSlider.options[index], index);
                            }}
                            aria-label={activeSlider.label}
                        />
                        <div className="disposition-slider-options">
                            {[...activeSlider.displayLabels].reverse().map((displayLabel, reverseIndex) => {
                                const realIndex = activeSlider.displayLabels.length - 1 - reverseIndex;
                                const isActive = realIndex === currentIndex;
                                return (
                                    <button
                                        key={displayLabel}
                                        className={`disposition-option${isActive ? ' active' : ''}`}
                                        onClick={() => onSelect(activeSlider.id, activeSlider.options[realIndex], realIndex)}
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
};
