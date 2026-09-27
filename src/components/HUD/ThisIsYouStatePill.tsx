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
    accentColor?: 'gold' | 'blue' | 'red' | 'purple';
}

export const ThisIsYouStatePill: FC<ThisIsYouStatePillProps> = ({
    category,
    value,
    options,
    onSelect,
    onInteract,
    accentColor = 'gold'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

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
        </div>
    );
};

export default ThisIsYouStatePill;
