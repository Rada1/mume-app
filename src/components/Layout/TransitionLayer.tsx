import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../../context/GameContext';
import '../../styles/effects.css';

/**
 * @file TransitionLayer.tsx
 * @description Manages full-screen blackout and fade-in transitions.
 */

export const TransitionLayer: React.FC = () => {
    const { gameState } = useGame();
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [shouldFadeOut, setShouldFadeOut] = useState(false);
    const prevGameState = useRef(gameState);

    useEffect(() => {
        // Trigger transition when moving from 'account' to 'playing'
        if (prevGameState.current === 'account' && gameState === 'playing') {
            console.log('[Transition] Triggering Account -> Playing Blackout');
            setIsTransitioning(true);
            setShouldFadeOut(false);

            // Small delay to ensure the account screen is fully unmounted, then fade out
            const timer = setTimeout(() => {
                setShouldFadeOut(true);
            }, 100);

            // Cleanup when transition is complete - using a longer timeout than the 3s CSS transition
            const endTimer = setTimeout(() => {
                setIsTransitioning(false);
                setShouldFadeOut(false);
            }, 3500);

            return () => {
                clearTimeout(timer);
                clearTimeout(endTimer);
            };
        }
        
        // Always track previous state
        prevGameState.current = gameState;
    }, [gameState]);

    if (!isTransitioning) return null;

    return (
        <div 
            className={`screen-transition-overlay ${shouldFadeOut ? 'fade-out' : ''}`}
            aria-hidden="true"
        />
    );
};
