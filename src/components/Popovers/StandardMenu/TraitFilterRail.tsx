/**
 * @file TraitFilterRail.tsx
 * @description Side filters for narrowing an inline action menu to one trait.
 */

import React from 'react';
import { createPortal } from 'react-dom';

export interface TraitFilterOption {
    key: string;
    label: string;
}

interface TraitFilterRailProps {
    anchorRef: React.RefObject<HTMLElement>;
    traits: TraitFilterOption[];
    activeKey: string | null;
    onChange: (key: string | null) => void;
    triggerHaptic?: (ms: number) => void;
}

export const TraitFilterRail: React.FC<TraitFilterRailProps> = ({
    anchorRef,
    traits,
    activeKey,
    onChange,
    triggerHaptic
}) => {
    const [position, setPosition] = React.useState<{ top: number; left: number } | null>(null);

    React.useLayoutEffect(() => {
        const updatePosition = () => {
            const anchor = anchorRef.current?.closest('.popover-menu') as HTMLElement | null;
            if (!anchor) return;
            const rect = anchor.getBoundingClientRect();
            const railWidth = 32;
            const gap = 8;
            const rightSideFits = rect.right + railWidth + gap < window.innerWidth;
            setPosition({
                top: rect.top + 44,
                left: rightSideFits ? rect.right + gap : Math.max(4, rect.left - railWidth - gap)
            });
        };

        updatePosition();
        const frameId = window.requestAnimationFrame(updatePosition);
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        return () => {
            window.cancelAnimationFrame(frameId);
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [anchorRef, traits.length]);

    if (!position || traits.length < 2) return null;

    const selectFilter = (key: string | null) => {
        triggerHaptic?.(15);
        onChange(key);
    };

    return createPortal(
        <div
            className="trait-filter-rail"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{
                position: 'fixed',
                top: position.top,
                left: position.left,
                zIndex: 70001,
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                pointerEvents: 'auto'
            }}
        >
            <FilterButton label="All traits" text="*" isActive={!activeKey} onClick={() => selectFilter(null)} />
            {traits.map(trait => (
                <FilterButton
                    key={trait.key}
                    label={trait.label}
                    text={getTraitAbbrev(trait.label)}
                    isActive={activeKey === trait.key}
                    onClick={() => selectFilter(activeKey === trait.key ? null : trait.key)}
                />
            ))}
        </div>
        ,
        document.body
    );
};

interface FilterButtonProps {
    label: string;
    text: string;
    isActive: boolean;
    onClick: () => void;
}

const FilterButton: React.FC<FilterButtonProps> = ({ label, text, isActive, onClick }) => (
    <button
        type="button"
        title={label}
        aria-label={label}
        aria-pressed={isActive}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
            e.stopPropagation();
            onClick();
        }}
        style={{
            width: '28px',
            height: '28px',
            borderRadius: '999px',
            border: isActive ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.16)',
            background: isActive ? 'var(--accent)' : 'rgba(15,18,25,0.84)',
            color: isActive ? '#000' : 'var(--accent)',
            fontSize: '0.58rem',
            fontWeight: 800,
            letterSpacing: 0,
            cursor: 'pointer',
            boxShadow: '0 8px 22px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            padding: 0
        }}
    >
        {text}
    </button>
);

const getTraitAbbrev = (label: string): string => {
    const words = label.trim().split(/\s+/).filter(Boolean);
    if (words.length > 1) return words.slice(0, 2).map(word => word[0]).join('').toUpperCase();
    return label.slice(0, 2).toUpperCase();
};
