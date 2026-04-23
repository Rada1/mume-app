/**
 * @file SpectateQueueHUD.tsx
 * @description HUD component to display the spectate queue and timer.
 */

import React from 'react';
import { useGame } from '../../../context/GameContext';
import { useModeStore } from '../../../stores/useModeStore';
import { ChevronRight, List, Timer, User, X } from 'lucide-react';
import './SpectateQueueHUD.css';

const SNOOP_ROTATION_MS = 10 * 60 * 1000;

export const SpectateQueueHUD: React.FC = () => {
    const { removeFromQueue, rotateQueue } = useGame();
    const { isSpectating, spectateTarget, spectateQueue, lastSnoopStartTime } = useModeStore();

    if (!isSpectating) return null;

    const queue = spectateQueue || [];
    const spectateCharacterName = spectateTarget;
    if (queue.length === 0 && (!spectateCharacterName || spectateCharacterName === 'None')) return null;

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
                <div className="hud-current-info">
                    <User size={20} className="hud-icon-active" />
                    <span className="hud-current-name">{spectateCharacterName || 'None'}</span>
                </div>
                
                <div className="hud-current-actions">
                    {queue.length > 0 && (
                        <button 
                            className="hud-action-btn next-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                rotateQueue(true);
                            }}
                            title="Next Player (Cycle to bottom)"
                        >
                            <ChevronRight size={18} />
                            <span>NEXT</span>
                        </button>
                    )}
                    {spectateCharacterName && spectateCharacterName !== 'None' && (
                        <button 
                            className="hud-action-btn stop-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                rotateQueue(false);
                            }}
                            title="Stop Current"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>

            {queue.length > 0 && (
                <div className="spectate-hud-list">
                    <div className="hud-list-header">
                        <List size={16} className="hud-icon" />
                        <span>NEXT IN QUEUE</span>
                    </div>
                    {queue.map((name, i) => (
                        <div key={`${name}-${i}`} className="hud-list-item">
                            <span className="queue-name">{name}</span>
                            <button 
                                className="remove-queue-btn"
                                onClick={() => removeFromQueue(name)}
                                title={`Remove ${name} from queue`}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
