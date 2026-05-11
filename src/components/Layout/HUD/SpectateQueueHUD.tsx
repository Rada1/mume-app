/**
 * @file SpectateQueueHUD.tsx
 * @description HUD component to display the spectate queue and timer.
 */

import React from 'react';
import { useGame } from '../../../context/GameContext';
import { useModeStore } from '../../../stores/useModeStore';
import { ChevronDown, ChevronRight, ChevronUp, List, Timer, User, X } from 'lucide-react';
import './SpectateQueueHUD.css';

const SNOOP_ROTATION_MS = 5 * 60 * 1000;
const MINIMIZED_KEY = 'mume-spectate-queue-minimized';

export const SpectateQueueHUD: React.FC = () => {
    const { removeFromQueue, rotateQueue } = useGame();
    const { isSpectating, spectateTarget, spectateQueue, lastSnoopStartTime } = useModeStore();
    const [now, setNow] = React.useState(() => Date.now());
    const [isMinimized, setIsMinimized] = React.useState(() => localStorage.getItem(MINIMIZED_KEY) === 'true');

    React.useEffect(() => {
        if (!isSpectating || !lastSnoopStartTime) return;
        setNow(Date.now());
        const interval = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(interval);
    }, [isSpectating, lastSnoopStartTime]);

    React.useEffect(() => {
        localStorage.setItem(MINIMIZED_KEY, String(isMinimized));
    }, [isMinimized]);

    if (!isSpectating) return null;

    const queue = spectateQueue || [];
    const spectateCharacterName = spectateTarget;
    if (queue.length === 0 && (!spectateCharacterName || spectateCharacterName === 'None')) return null;

    const remainingMs = lastSnoopStartTime 
        ? Math.max(0, SNOOP_ROTATION_MS - (now - lastSnoopStartTime))
        : 0;
    
    const mins = Math.floor(remainingMs / 60000);
    const secs = Math.floor((remainingMs % 60000) / 1000);
    const timerStr = `${mins}:${secs.toString().padStart(2, '0')}`;

    const handleRemove = (nameToRemove: string) => {
        removeFromQueue(nameToRemove);
    };

    return (
        <div className={`spectate-queue-hud${isMinimized ? ' is-minimized' : ''}`}>
            <div className="spectate-hud-header">
                <div className="spectate-hud-title">
                    <List size={13} className="hud-icon" />
                    <span>Spectate Queue</span>
                </div>
                <div className="spectate-hud-header-actions">
                    <div className="spectate-hud-timer">
                        <Timer size={13} className="hud-icon" />
                        <span className="hud-timer">{timerStr}</span>
                    </div>
                    <button
                        className="spectate-minimize-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsMinimized(prev => !prev);
                        }}
                        title={isMinimized ? 'Show spectate queue' : 'Hide spectate queue'}
                    >
                        {isMinimized ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
                    </button>
                </div>
            </div>

            {isMinimized && (
                <div className="spectate-hud-minimized-summary">
                    <span>{spectateCharacterName || 'None'}</span>
                    {queue.length > 0 && <span>{queue.length} queued</span>}
                </div>
            )}

            {!isMinimized && (
                <>
            
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
                        <ChevronRight size={14} className="hud-icon" />
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
                </>
            )}
        </div>
    );
};
