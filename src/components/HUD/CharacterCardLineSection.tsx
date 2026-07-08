/**
 * @file CharacterCardLineSection.tsx
 * @description Compact drawer-line renderer for drawer-backed sections in the character card.
 */

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { DrawerLine } from '../../types';
import { LineItem } from '../Drawers/LineItem';

interface CharacterCardLineSectionProps {
    lines: DrawerLine[];
    emptyMessage: string;
    onRefresh: () => void;
    className?: string;
}

// --- Render Helpers ---
export const CharacterCardLineSection: React.FC<CharacterCardLineSectionProps> = ({
    lines,
    emptyMessage,
    onRefresh,
    className
}) => (
    <div className={`character-card-line-section${className ? ` ${className}` : ''}`}>
        <div className="character-card-line-toolbar">
            <button
                type="button"
                className="character-card-line-refresh"
                onClick={(event) => {
                    event.stopPropagation();
                    onRefresh();
                }}
                aria-label="Refresh section"
                title="Refresh"
            >
                <RefreshCw size={11} strokeWidth={2.5} />
            </button>
        </div>

        <div className="character-card-line-list">
            {lines.length > 0 ? (
                lines.map(line => (
                    <LineItem
                        key={line.id}
                        line={line}
                        fontSize="0.62rem"
                        style={{ padding: '0 2px', minHeight: '15px', lineHeight: 1.35 }}
                    />
                ))
            ) : (
                <div className="character-card-empty-lines">{emptyMessage}</div>
            )}
        </div>
    </div>
);
