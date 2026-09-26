/**
 * @file TacticalTargetBar.tsx
 * @description Sleek vertical terminal target menu docked on the left during mobile button holds.
 */

// --- Logic Section ---
import React, { FC, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { GmcpOccupant } from '../../../types';
import { getRoomTargetSuggestions, CommandTargetSuggestion } from '../../../utils/commandSuggestionUtils';
import './TacticalTargetBar.css';

export interface TacticalTargetBarProps {
    isOpen: boolean;
    currentTarget: string | null;
    selectedTarget: string | null;
    onSelectTarget: (targetValue: string) => void;
    roomOccupants: GmcpOccupant[];
    roomItems?: GmcpOccupant[];
    characterName?: string;
}

export const TacticalTargetBar: FC<TacticalTargetBarProps> = ({
    isOpen,
    currentTarget,
    selectedTarget,
    onSelectTarget,
    roomOccupants,
    roomItems = [],
    characterName = ''
}) => {
    const candidates: CommandTargetSuggestion[] = useMemo(() => {
        if (!isOpen) return [];
        return getRoomTargetSuggestions(roomOccupants, roomItems, 'characters', characterName);
    }, [isOpen, roomOccupants, roomItems, characterName]);

    if (!isOpen || typeof document === 'undefined') return null;

    return createPortal(
        <div
            className="tactical-target-bar"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
            onPointerCancel={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="tactical-target-bar-header">
                <span className="tactical-target-bar-title">
                    <span>▸ TARGETS</span>
                    <span className="tactical-target-bar-count">({candidates.length})</span>
                </span>
            </div>

            <div className="tactical-target-bar-list">
                {candidates.length === 0 ? (
                    <div className="tactical-target-bar-empty">
                        No viable targets
                    </div>
                ) : (
                    candidates.map((cand) => {
                        const cleanLock = currentTarget ? currentTarget.replace(/[*']/g, '').trim().toLowerCase() : '';
                        const cleanSel = selectedTarget ? selectedTarget.replace(/[*']/g, '').trim().toLowerCase() : '';
                        const cleanVal = cand.value.replace(/[*']/g, '').trim().toLowerCase();
                        const cleanLabel = cand.label.replace(/[*']/g, '').trim().toLowerCase();

                        const lockWords = cleanLock ? cleanLock.split(/\s+/) : [];
                        const isLocked = Boolean(cleanLock && (
                            cleanLock === cleanVal ||
                            cleanLabel === cleanLock ||
                            cleanLabel.split(/\s+/).includes(cleanLock) ||
                            lockWords.includes(cleanVal)
                        ));

                        const isSelected = cleanSel
                            ? (cleanSel === cleanVal || cleanLabel.split(/\s+/).includes(cleanSel))
                            : isLocked;

                        const category = (cand.meta || 'npc').toLowerCase();

                        return (
                            <div
                                key={cand.key}
                                className={`tactical-target-bar-item ${isSelected ? 'is-selected' : ''} ${isLocked ? 'is-locked' : ''}`}
                                onPointerDown={(e) => {
                                    e.stopPropagation();
                                    onSelectTarget(cand.value);
                                }}
                                onPointerUp={(e) => {
                                    e.stopPropagation();
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectTarget(cand.value);
                                }}
                            >
                                <span className="tactical-target-bar-name" title={cand.label}>
                                    {cand.label}
                                </span>
                                <span className={`tactical-target-bar-badge cat-${category}`}>
                                    {category}
                                </span>
                            </div>
                        );
                    })
                )}
            </div>
        </div>,
        document.body
    );
};
