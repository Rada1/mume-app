/**
 * @file SpectateQueueHUD.tsx
 * @description HUD component to display the spectate queue and timer.
 */

import React from 'react';
import { useGame } from '../../../context/GameContext';
import { List, Timer, User, X } from 'lucide-react';
import './SpectateQueueHUD.css';

const SNOOP_ROTATION_MS = 10 * 60 * 1000;

export const SpectateQueueHUD: React.FC = () => {
    const { 
        spectateQueue, spectateCharacterName, lastSnoopStartTime, isSpectateMode, 
        removeFromQueue, rotateQueue 
    } = useGame();

    if (!isSpectateMode) return null;
    if (spectateQueue.length === 0 && (!spectateCharacterName || spectateCharacterName === 'None')) return null;

    const remainingMs = lastSnoopStartTime 
        ? Math.max(0, SNOOP_ROTATION_MS - (Date.now() - lastSnoopStartTime))
        : 0;
    
    const mins = Math.floor(remainingMs / 60000);
    const secs = Math.floor((remainingMs % 60000) / 1000);
    const timerStr = `${mins}:${secs.toString().padStart(2, '0')}`;

    const handleRemove = (nameToRemove: string) => {
        removeFromQueue(nameToRemove);
    };

    return (
        <div className="spectate-queue-hud">
            <div className="spectate-hud-header">
                <Timer size={14} className="hud-icon" />
                <span className="hud-timer">{timerStr}</span>
            </div>
            
            <div className="spectate-hud-current">
                <User size={14} className="hud-icon-active" />
                <span className="hud-current-name">{spectateCharacterName || 'None'}</span>
                {spectateCharacterName && spectateCharacterName !== 'None' && (
                    <button 
                        className="remove-queue-btn active-remove"
                        onClick={(e) => {
                            e.stopPropagation();
                            console.log('[Spectate] Manual Rotate Clicked for:', spectateCharacterName);
                            rotateQueue(true);
                        }}
                        title="Skip/Stop Current Spectate"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {spectateQueue.length > 0 && (
                <div className="spectate-hud-list">
                    <div className="hud-list-header">
                        <List size={12} className="hud-icon" />
                        <span>NEXT UP</span>
                    </div>
                    {spectateQueue.map((name, i) => (
                        <div key={`${name}-${i}`} className="hud-list-item">
                            <span className="queue-name">{name}</span>
                            <button 
                                className="remove-queue-btn"
                                onClick={() => removeFromQueue(name)}
                                title={`Remove ${name} from queue`}
                            >
                                <X size={10} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
