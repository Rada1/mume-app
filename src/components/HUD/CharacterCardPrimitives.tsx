/**
 * @file CharacterCardPrimitives.tsx
 * @description Small presentational helpers used by the character card.
 */

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface SectionProps {
    title: string;
    icon: React.ReactNode;
    defaultOpen?: boolean;
    className?: string;
    children: React.ReactNode;
}

// --- Render Helpers ---
export const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="char-card-info-row">
        <span className="char-card-info-label">{label}</span>
        <span className="char-card-info-value">{value}</span>
    </div>
);

export const ConditionPill: React.FC<{ label: string; active: boolean }> = ({ label, active }) => (
    active ? <span className="char-card-condition-pill">{label}</span> : null
);

export const Section: React.FC<SectionProps> = ({
    title, icon, defaultOpen = true, className, children
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className={className}>
            <button type="button" className="prompt-gear-card-divider prompt-gear-card-divider-toggle" onClick={() => setIsOpen(o => !o)}>
                {icon}
                <span>{title}</span>
                <ChevronDown size={11} strokeWidth={2.5} className={`prompt-gear-card-chevron${isOpen ? ' is-open' : ''}`} />
            </button>
            {isOpen && children}
        </div>
    );
};

export const ArmourIcon: React.FC<{ size?: number }> = ({ size = 12 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 3h8l3 2 3 4-4 3-2-2v11H8V10l-2 2-4-3 3-4 3-2z" />
        <path d="M8 3l4 5 4-5" />
        <path d="M8 13h8" />
        <path d="M8 17h8" />
    </svg>
);

export const StatBar: React.FC<{ value: number; max: number; color: string; icon: React.ReactNode; label: string }> = ({ value, max, color, icon, label }) => {
    const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
    return (
        <div className="char-card-statbar-row" title={label}>
            <span className="char-card-statbar-icon" style={{ color }}>{icon}</span>
            <div className="char-card-statbar-track">
                <div className="char-card-statbar-fill" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}` }} />
                <span className="char-card-statbar-value">{value.toLocaleString()}/{max.toLocaleString()}</span>
            </div>
        </div>
    );
};

