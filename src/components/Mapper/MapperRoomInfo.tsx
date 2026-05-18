import React, { useState } from 'react';
import { useGame, useLog, useUI, useVitals } from '../../context/GameContext';
import { TokenRenderer } from '../Messages/TokenRenderer';
import { UtensilsCrossed, Droplets } from 'lucide-react';
import './MapperRoomInfo.css';

/**
 * @file MapperRoomInfo.tsx
 * @description Renders current room name and description as an overlay on the map.
 */

export const MapperRoomInfo: React.FC = () => {
    const { roomName, roomDesc, currentTerrain, triggerHaptic, env, isFoggy, viewport } = useGame();
    const { stats } = useVitals();
    const { setPopoverState, popoverState } = useUI();
    const [isExpanded, setIsExpanded] = useState(false);
    const log = useLog();
    const processMessageTokens = log?.processMessageTokens;

    if (!roomName) return null;

    const { getLightingIcon, getWeatherIcon, lighting, weather } = env;
    const isMobilePortrait = viewport.isMobile && !viewport.isLandscape;

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        const inlineRoomName = (e.target as HTMLElement).closest('.room-name-inline') as HTMLElement | null;
        if (inlineRoomName) {
            const entityId = inlineRoomName.getAttribute('data-id') || `room:${roomName.toLowerCase()}`;
            if (popoverState?.entityId === entityId) {
                setPopoverState(null);
                triggerHaptic?.(10);
                return;
            }
            const rect = inlineRoomName.getBoundingClientRect();
            setPopoverState({
                x: rect.right,
                y: rect.top + rect.height / 2,
                setId: 'cat-room',
                category: 'cat-room',
                context: roomName,
                entityId,
                menuDisplay: 'list',
                accentColor: inlineRoomName.style.getPropertyValue('--glow-color').trim() || undefined,
                preferSide: 'right'
            });
            triggerHaptic?.(20);
            return;
        }
        triggerHaptic?.(10);
        setIsExpanded(!isExpanded);
    };

    // --- Logic Section: Tokenization ---
    const nameTokens = processMessageTokens ? processMessageTokens(roomName) : [];
    const descTokens = (processMessageTokens && roomDesc) ? processMessageTokens(`\x1b[0m${roomDesc}`) : [];

    return (
        <div className={`mapper-room-info-container terrain-${String(currentTerrain || 'field').toLowerCase()} ${isExpanded ? 'expanded' : ''}`}>
            <div className="mri-content" onClick={handleToggle}>
                <div className="mri-name">
                    {nameTokens.length > 0 ? (
                        <TokenRenderer
                            tokens={nameTokens}
                            metadata={{
                                id: `room:${roomName.toLowerCase()}`,
                                context: roomName,
                                category: 'cat-room',
                                cmd: 'cat-room',
                                action: 'menu'
                            }}
                        />
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
