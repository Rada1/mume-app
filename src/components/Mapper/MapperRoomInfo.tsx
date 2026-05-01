import React, { useState } from 'react';
import { useGame, useLog } from '../../context/GameContext';
import { TokenRenderer } from '../Messages/TokenRenderer';
import './MapperRoomInfo.css';

/**
 * @file MapperRoomInfo.tsx
 * @description Renders current room name and description as an overlay on the map.
 */

export const MapperRoomInfo: React.FC = () => {
    const { roomName, roomDesc, currentTerrain, triggerHaptic } = useGame();
    const [isExpanded, setIsExpanded] = useState(false);
    const log = useLog();
    const processMessageTokens = log?.processMessageTokens;

    if (!roomName) return null;

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        triggerHaptic?.(10);
        setIsExpanded(!isExpanded);
    };

    // --- Logic Section: Tokenization ---
    // We use the same colors as the main room card (Green for name)
    const nameTokens = processMessageTokens ? processMessageTokens(`\x1b[1;32m${roomName}\x1b[0m`) : [];
    const descTokens = (processMessageTokens && roomDesc) ? processMessageTokens(`\x1b[0m${roomDesc}`) : [];

    return (
        <div className={`mapper-room-info-container terrain-${String(currentTerrain || 'field').toLowerCase()} ${isExpanded ? 'expanded' : ''}`}>
            <div className="mri-content" onClick={handleToggle}>
                <div className="mri-name">
                    {nameTokens.length > 0 ? (
                        <TokenRenderer tokens={nameTokens} />
                    ) : (
                        <span className="fallback-room-name">{roomName}</span>
                    )}
                </div>
                {roomDesc && (
                    <div className="mri-desc">
                        {descTokens.length > 0 ? (
                            <TokenRenderer tokens={descTokens} />
                        ) : (
                            <span className="fallback-room-desc">{roomDesc}</span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
