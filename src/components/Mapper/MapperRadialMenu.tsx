import React, { useMemo } from 'react';

interface RadialMenuProps {
    x: number;
    y: number;
    roomId: string | null;
    currentPointer: { x: number, y: number } | null;
    onAction: (action: 'info' | 'walk' | 'sync' | 'delete', state: 'start' | 'end' | 'trigger') => void;
}

export const MapperRadialMenu: React.FC<RadialMenuProps> = ({ x, y, roomId, currentPointer, onAction }) => {
    const selection = useMemo(() => {
        if (!currentPointer) return null;
        const dx = currentPointer.x - x;
        const dy = currentPointer.y - y;
        const dist = Math.hypot(dx, dy);
        if (dist < 30) return null;

        // Angle in degrees (0 is right, 90 is down, 180 is left, 270 is up)
        let angle = Math.atan2(dy, dx) * (180 / Math.PI);
        if (angle < 0) angle += 360;

        // Top arc (210 to 330) -> Info
        // Bottom arc (30 to 150) -> Walk
        if (angle >= 210 && angle <= 330) return 'info';
        if (angle >= 30 && angle <= 150) return 'walk';
        
        return null;
    }, [x, y, currentPointer]);

    // Handle selection changes
    React.useEffect(() => {
        if (selection === 'walk') {
            onAction('walk', 'start');
        } else {
            onAction('walk', 'end');
        }
    }, [selection, onAction]);

    const infoStyle: React.CSSProperties = {
        position: 'absolute',
        top: '-70px',
        left: '-35px',
        width: '70px',
        height: '70px',
        borderRadius: '50%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: selection === 'info' ? 'rgba(137, 180, 250, 0.95)' : 'rgba(30, 30, 46, 0.8)',
        backdropFilter: 'blur(8px)',
        border: `2px solid ${selection === 'info' ? '#89b4fa' : '#313244'}`,
        color: selection === 'info' ? '#11111b' : '#cdd6f4',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: `scale(${selection === 'info' ? 1.2 : 1})`,
        boxShadow: selection === 'info' ? '0 0 20px rgba(137, 180, 250, 0.4)' : 'none',
        zIndex: 10,
    };

    const walkStyle: React.CSSProperties = {
        position: 'absolute',
        bottom: '-70px',
        left: '-35px',
        width: '70px',
        height: '70px',
        borderRadius: '50%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: selection === 'walk' ? 'rgba(166, 227, 161, 0.95)' : 'rgba(30, 30, 46, 0.8)',
        backdropFilter: 'blur(8px)',
        border: `2px solid ${selection === 'walk' ? '#a6e3a1' : '#313244'}`,
        color: selection === 'walk' ? '#11111b' : '#cdd6f4',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: `scale(${selection === 'walk' ? 1.2 : 1})`,
        boxShadow: selection === 'walk' ? '0 0 20px rgba(166, 227, 161, 0.4)' : 'none',
        zIndex: 10,
    };

    return (
        <div style={{
            position: 'absolute',
            left: x,
            top: y,
            width: 0,
            height: 0,
            pointerEvents: 'none',
            zIndex: 2000,
        }}>
            {/* Center dot */}
            <div style={{
                position: 'absolute',
                left: '-10px',
                top: '-10px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                border: '2px solid rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(4px)',
            }} />

            {/* Indicator line */}
            {currentPointer && Math.hypot(currentPointer.x - x, currentPointer.y - y) > 20 && (
                <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: Math.hypot(currentPointer.x - x, currentPointer.y - y),
                    height: '2px',
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    transformOrigin: '0 0',
                    transform: `rotate(${Math.atan2(currentPointer.y - y, currentPointer.x - x)}rad)`,
                    zIndex: 5,
                }} />
            )}

            {/* Info Option */}
            <div style={infoStyle}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                <span style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '2px' }}>INFO</span>
            </div>

            {/* Walk Option */}
            <div style={walkStyle}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 4v16"></path><path d="M17 14l-4 4-4-4"></path></svg>
                <span style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '2px' }}>WALK</span>
            </div>
        </div>
    );
};
