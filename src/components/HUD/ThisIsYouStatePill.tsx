/**
 * @file ThisIsYouStatePill.tsx
 * @description Interactive state pill with explicit category label and popover selector.
 */

// --- Logic Section ---
import React, { FC, useEffect, useRef, useState } from 'react';
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
    accentColor?: 'gold' | 'blue' | 'red' | 'purple';
}

export const ThisIsYouStatePill: FC<ThisIsYouStatePillProps> = ({
    category,
    value,
    options,
    onSelect,
    accentColor = 'gold'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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
            <button
                type="button"
                className={`this-is-you-pill accent-${accentColor}${isOpen ? ' is-active' : ''}`}
                onClick={() => setIsOpen(open => !open)}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                title={`Change ${category} (current: ${value})`}
            >
                <span className="this-is-you-pill-category">{category}:</span>
                <strong className="this-is-you-pill-value">{value}</strong>
                <span className="this-is-you-pill-arrow" aria-hidden="true">▼</span>
            </button>

            {isOpen && (
                <div className="this-is-you-popover" role="listbox" aria-label={`Select ${category}`}>
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
                                    onSelect(option);
                                    setIsOpen(false);
                                }}
                            >
                                <span>{option.label}</span>
                                {isSelected && <span className="this-is-you-check" aria-hidden="true">✓</span>}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ThisIsYouStatePill;
