/**
 * @file ThisIsYouStatePill.tsx
 * @description Interactive state pill with explicit category label and popover selector.
 */

// --- Logic Section ---
import React, { FC, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './ThisIsYouStatePill.css';

export interface StateOption {
    label: string;
    value: string;
    command?: string;
}

export interface ThisIsYouStatePillProps {
    category: string;
    value: string;
    options: StateOption[];
    onSelect: (option: StateOption) => void;
    onInteract?: () => void;
    inlineOptions?: boolean;
    disabled?: boolean;
    accentColor?: 'gold' | 'blue' | 'red' | 'purple';
}

export const ThisIsYouStatePill: FC<ThisIsYouStatePillProps> = ({
    category,
    value,
    options,
    onSelect,
    onInteract,
    inlineOptions = false,
    disabled = false,
    accentColor = 'gold'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const inlineSliderOptions = category === 'Position' ? [...options].reverse() : options;
    const inlineCurrentIndex = Math.max(0, inlineSliderOptions.findIndex(option =>
        option.value.toLowerCase() === value.toLowerCase()
    ));
    const selectInlineOption = (index: number) => {
        const option = inlineSliderOptions[index];
        if (!option || disabled) return;
        onInteract?.();
        onSelect(option);
    };

    useLayoutEffect(() => {
        if (!isOpen) return;
        const updatePosition = () => {
            const anchor = containerRef.current?.getBoundingClientRect();
            const menu = popoverRef.current;
            if (!anchor || !menu) return;
            const margin = 8;
            const left = Math.max(margin, Math.min(anchor.left, window.innerWidth - menu.offsetWidth - margin));
            const above = anchor.top - menu.offsetHeight - 5;
            const below = anchor.bottom + 5;
            const top = above >= margin ? above : Math.min(below, window.innerHeight - menu.offsetHeight - margin);
            setMenuPosition({ top: Math.max(margin, top), left });
        };
        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)
                && !popoverRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    // --- Render Section ---
    return (
        <div className="this-is-you-pill-wrapper" ref={containerRef}>
            {inlineOptions ? (
                <div className="this-is-you-state-column" role="group" aria-label={category}>
                    <div className="this-is-you-state-column-title">{category}</div>
                    <div className="this-is-you-inline-slider">
                        <div className="this-is-you-inline-slider-codes" aria-hidden="true">
                            {[...inlineSliderOptions.keys()].reverse().map(index => <span
                                key={inlineSliderOptions[index].value}
                                className={index === inlineCurrentIndex ? 'is-active' : ''}
                            >{index + 1}</span>)}
                        </div>
                        <input
                            className="this-is-you-inline-slider-range"
                            type="range"
                            min="0"
                            max={inlineSliderOptions.length - 1}
                            step="1"
                            value={inlineCurrentIndex}
                            disabled={disabled}
                            onChange={event => selectInlineOption(Number(event.target.value))}
                            aria-label={category}
                        />
                        <div className="this-is-you-inline-slider-options">
                            {[...inlineSliderOptions.keys()].reverse().map(index => {
                                const option = inlineSliderOptions[index];
                                const isActive = index === inlineCurrentIndex;
                                return <button
                                    key={option.value}
                                    type="button"
                                    className={`disposition-option${isActive ? ' active' : ''}`}
                                    aria-pressed={isActive}
                                    disabled={disabled}
                                    onClick={() => selectInlineOption(index)}
                                >{option.label.toUpperCase()}</button>;
                            })}
                        </div>
                    </div>
                </div>
            ) : <>
            <button
                type="button"
                className={`this-is-you-pill accent-${accentColor}${isOpen ? ' is-active' : ''}`}
                onClick={() => {
                    onInteract?.();
                    setIsOpen(open => !open);
                }}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                title={`Change ${category} (current: ${value})`}
            >
                <span className="this-is-you-pill-category">{category}:</span>
                <strong className="this-is-you-pill-value">{value}</strong>
                <span className="this-is-you-pill-arrow" aria-hidden="true">▼</span>
            </button>

            {isOpen && createPortal(
                <div ref={popoverRef} className="this-is-you-popover" role="listbox" aria-label={`Select ${category}`}
                    style={menuPosition ? { top: menuPosition.top, left: menuPosition.left } : { visibility: 'hidden' }}>
                    <div className="this-is-you-popover-header">{category}</div>
                    {options.map(option => {
                        const isSelected = option.label.toLowerCase() === value.toLowerCase();
                        return (
                            <button
                                key={option.value}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                className={`this-is-you-popover-item${isSelected ? ' is-selected' : ''}`}
                                onClick={() => {
                                    onInteract?.();
                                    onSelect(option);
                                    setIsOpen(false);
                                }}
                            >
                                <span>{option.label}</span>
                                {isSelected && <span className="this-is-you-check" aria-hidden="true">✓</span>}
                            </button>
                        );
                    })}
                </div>, document.body
            )}
            </>}
        </div>
    );
};

export default ThisIsYouStatePill;
