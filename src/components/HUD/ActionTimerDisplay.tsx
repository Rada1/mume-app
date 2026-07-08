/**
 * @file ActionTimerDisplay.tsx
 * @description Renders a high-fidelity visual progress bar for active spells and time-taking actions.
 */

import React, { useEffect, useState } from 'react';
import { useActionTimerStore } from '../../stores/useActionTimerStore';

// --- Logic Section ---

export const ActionTimerDisplay: React.FC = () => {
    const active = useActionTimerStore(state => state.activeTimer);
    const cancelTimer = useActionTimerStore(state => state.cancelTimer);
    const [elapsedMs, setElapsedMs] = useState(0);

    useEffect(() => {
        if (!active) {
            setElapsedMs(0);
            return;
        }

        if (active.isFinished) {
            if (active.isInterrupted) {
                const finalElapsed = active.elapsedMs || (Date.now() - active.startedAt);
                setElapsedMs(finalElapsed);
            } else {
                setElapsedMs(active.elapsedMs || active.durationMs);
            }

            // Keep visible for a shorter time if it's a quick general command timer
            const keepDuration = active.durationMs <= 1000 ? 1000 : 2000;
            const timer = setTimeout(() => {
                cancelTimer();
            }, keepDuration);
            return () => clearTimeout(timer);
        }

        const start = active.startedAt;
        const duration = active.durationMs;

        const update = () => {
            const now = Date.now();
            const elapsed = now - start;
            
            setElapsedMs(elapsed);
            
            // Auto-complete quick generic command indicators (<= 1s visual duration)
            if (duration <= 1000 && elapsed >= duration) {
                setElapsedMs(duration);
                useActionTimerStore.getState().completeTimer(false);
                return;
            }

            const currentActive = useActionTimerStore.getState().activeTimer;
            if (currentActive && !currentActive.isFinished) {
                requestAnimationFrame(update);
            }
        };

        const animationFrame = requestAnimationFrame(update);
        return () => {
            cancelAnimationFrame(animationFrame);
        };
    }, [active, cancelTimer]);

    if (!active) return null;
    if (active.durationMs <= 1000) return null;

    // Get color theme based on action type
    const getThemeColors = () => {
        if (active.isInterrupted) {
            return {
                bg: 'rgba(239, 68, 68, 0.08)',
                border: 'rgba(239, 68, 68, 0.35)',
                text: '#ef4444'
            };
        }
        if (active.isFinished) {
            return {
                bg: 'rgba(34, 197, 94, 0.08)',
                border: 'rgba(34, 197, 94, 0.35)',
                text: '#22c55e'
            };
        }
        if (active.type === 'spell') {
            return {
                bg: 'rgba(192, 132, 252, 0.08)',
                border: 'rgba(192, 132, 252, 0.25)',
                text: '#e879f9'
            };
        }
        if (active.type === 'skill') {
            return {
                bg: 'rgba(234, 179, 8, 0.08)',
                border: 'rgba(234, 179, 8, 0.25)',
                text: '#facc15'
            };
        }
        return {
            bg: 'rgba(34, 211, 238, 0.08)',
            border: 'rgba(34, 211, 238, 0.25)',
            text: '#22d3ee'
        };
    };

    const colors = getThemeColors();

    const getStatusTextAndLabel = () => {
        if (!active) return { label: '', status: '' };
        
        let label = active.name;
        let status = 'Attempting';
        
        if (active.isFinished) {
            if (active.isInterrupted) {
                status = 'Interrupted';
            } else {
                status = 'Completed';
            }
        } else {
            if (active.name.toLowerCase().startsWith('casting:')) {
                label = active.name.substring(8).trim();
                status = 'Casting';
            } else if (active.name.toLowerCase().startsWith('picking')) {
                label = 'Lockpick';
                status = 'Picking';
            } else if (active.name.toLowerCase() === 'bandaging') {
                status = 'Bandaging';
            } else if (active.name.toLowerCase() === 'searching') {
                status = 'Searching';
            } else {
                status = 'Attempting';
            }
        }
        
        return { label, status };
    };

    const { label, status } = getStatusTextAndLabel();
    const stopwatchText = `${(elapsedMs / 1000).toFixed(2)}s`;

    return (
        <div 
            className="action-timer-pill"
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '6px',
                height: '18px',
                padding: '0 8px',
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                boxSizing: 'border-box',
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(4px)',
                zIndex: 5,
                transition: 'all 0.3s ease'
            }}
        >
            <span 
                style={{
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: '#fff',
                    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}
            >
                {label}
            </span>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    color: colors.text,
                    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                    whiteSpace: 'nowrap'
                }}
            >
                <span style={{ textTransform: 'uppercase', letterSpacing: '0.2px' }}>{status}</span>
                <span style={{ fontFamily: 'monospace', opacity: 0.8, color: '#fff' }}>{stopwatchText}</span>
            </div>
        </div>
    );
};
