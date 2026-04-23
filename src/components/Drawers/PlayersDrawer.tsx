import React, { useRef } from 'react';
import { PlayersView } from './Views/PlayersView';
import { useGame } from '../../context/GameContext';
import './CharacterDrawer.css';
import './PlayersDrawer.css';

interface PlayersDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
}

export const PlayersDrawer: React.FC<PlayersDrawerProps> = (props) => {
    const { 
        handleLogPointerDown, handleLogPointerUp, triggerHaptic
    } = useGame();

    const swipePos = useRef<{ x: number, y: number } | null>(null);

    const onPointerDownInternal = (e: React.PointerEvent) => {
        const target = e.target as HTMLElement;
        const container = e.currentTarget as HTMLElement;
        if (target.closest('button') || target.closest('a') || target.closest('.inline-btn') || target.tagName === 'INPUT' || target.closest('.group-member-row') || target.closest('.drawer-tab')) {
            if (target.closest('.inline-btn')) handleLogPointerDown(e);
            return;
        }
        swipePos.current = { x: e.clientX, y: e.clientY };
        container.setPointerCapture(e.pointerId);
    };

    const onPointerUpInternal = (e: React.PointerEvent) => {
        const target = e.target as HTMLElement;
        const container = e.currentTarget as HTMLElement;
        if (target.closest('button') || target.closest('a') || target.closest('.inline-btn') || target.tagName === 'INPUT' || target.closest('.group-member-row') || target.closest('.drawer-tab')) {
            if (target.closest('.inline-btn')) handleLogPointerUp(e);
            return;
        }
        if (swipePos.current) {
            const deltaX = e.clientX - swipePos.current.x;
            const deltaY = e.clientY - swipePos.current.y;
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);

            // Swipe down OR swipe left to close (since it's on the left edge)
            if ((deltaY > 50 && absY > absX) || (deltaX < -40 && absX > absY)) {
                if (window.innerWidth > 1024) props.onClose();
            }
        }
        swipePos.current = null;
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && window.innerWidth > 1024) {
            triggerHaptic(10);
            props.onClose();
        }
    };

    if (!props.isOpen) return null;

    return (
        <div 
            className="character-drawer-overlay open"
            onClick={handleBackdropClick}
        >
            <div
                className="players-drawer log-card-drawer left-drawer open"
                onPointerDown={onPointerDownInternal}
                onPointerUp={onPointerUpInternal}
                onPointerCancel={onPointerUpInternal}
                style={{ touchAction: 'pan-y' }}
            >
                <PlayersView {...props} />
            </div>
        </div>
    );
};
