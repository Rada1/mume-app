import React, { useRef } from 'react';

export type DrawerSide = 'bottom' | 'left';

interface GameDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    side: DrawerSide;
    title: string;
    icon?: React.ReactNode;
    items: string[];
    isLoading?: boolean;
    /** Optional rich section rendered above the items list (e.g. stat info) */
    topSection?: React.ReactNode;
}

const GameDrawer: React.FC<GameDrawerProps> = ({
    isOpen, onClose, side, title, icon, items, isLoading, topSection
}) => {
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStartRef.current) return;
        const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
        const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
        if (side === 'bottom' && dy > 60) onClose();
        if (side === 'left' && dx < -60) onClose();
        touchStartRef.current = null;
    };

    const renderBody = () => {
        if (isLoading) {
            return (
                <div style={{
                    padding: '24px', textAlign: 'center',
                    color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', fontSize: '0.9rem'
                }}>
                    Loading…
                </div>
            );
        }
        if (items.length === 0 && !topSection) {
            return (
                <div style={{
                    padding: '24px', textAlign: 'center',
                    color: 'rgba(255,255,255,0.25)', fontStyle: 'italic', fontSize: '0.9rem'
                }}>
                    Nothing here.
                </div>
            );
        }
        return (
            <>
                {topSection}
                {items.length > 0 && (
                    <ul style={{ margin: 0, padding: '4px 0', listStyle: 'none' }}>
                        {items.map((item, i) => (
                            <li key={i} style={{
                                padding: '8px 16px',
                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                                fontSize: '0.88rem',
                                color: 'rgba(255,255,255,0.8)',
                                lineHeight: 1.4
                            }}>
                                {item}
                            </li>
                        ))}
                    </ul>
                )}
            </>
        );
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`drawer-backdrop ${isOpen ? 'drawer-backdrop-open' : ''}`}
                onPointerDown={(e) => { e.stopPropagation(); onClose(); }}
            />

            {/* Drawer panel */}
            <div
                className={`game-drawer game-drawer-${side} ${isOpen ? 'game-drawer-open' : ''}`}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {/* Header */}
                <div className="drawer-header">
                    {side === 'bottom' && <div className="drawer-handle-bar" />}
                    <div className="drawer-title">
                        {icon && <span className="drawer-icon">{icon}</span>}
                        {title}
                    </div>
                    <button className="drawer-close-btn" onClick={onClose}>✕</button>
                </div>

                {/* Scrollable content */}
                <div className="drawer-content">
                    {renderBody()}
                </div>
            </div>
        </>
    );
};

export default GameDrawer;
