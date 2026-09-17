/**
 * @file DispositionSliderPopout.tsx
 * @description Three-slider prompt popout for mood, spell speed, and alertness.
 */

import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
// CustomPromptBar owns the desktop prompt indicators. Import the shared
// popover styles here so they are present whenever an indicator opens one,
// rather than relying on the legacy PromptBox component being mounted.
import './PromptBox.css';

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
    const panelRef = useRef<HTMLDivElement>(null);
    const visibleSliders = slider ? [slider] : (sliders || []);
    const popoutTop = anchorRect.top < 280
        ? anchorRect.bottom + 12
        : Math.max(16, anchorRect.top - 240);

    useEffect(() => {
        const closeOnOutsideClick = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) onClose();
        };
        // Bubble after React's click handler so prompt controls can dispatch
        // their command before an open slider is dismissed.
        document.addEventListener('click', closeOnOutsideClick);
        return () => document.removeEventListener('click', closeOnOutsideClick);
    }, [onClose]);

    return ReactDOM.createPortal(
    <>
        <div
            ref={panelRef}
            className={`disposition-popout${slider ? ' disposition-single-popout' : ''}`}
            style={{
                top: popoutTop,
                bottom: 'auto',
                left: anchorRect.left + (anchorRect.width / 2)
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="disposition-popout-title">{slider?.label || 'Disposition'}</div>
            {visibleSliders.map(activeSlider => {
                const currentIndex = getIndex(activeSlider.value, activeSlider.options);
                return (
                    <div key={activeSlider.id} className="disposition-slider-column has-codes">
                        {slider
                            ? <div className="disposition-slider-label disposition-slider-label--spacer" aria-hidden="true" />
                            : <div className="disposition-slider-label">{activeSlider.label}</div>}
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
