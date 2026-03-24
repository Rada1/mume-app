import React, { useState, useEffect, useRef } from 'react';

export const DebugConsole: React.FC = () => {
    const [logs, setLogs] = useState<string[]>([]);
    const [visible, setVisible] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const originalLog = console.log;
        console.log = (...args: any[]) => {
            const msg = args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ');
            
            if (msg.includes('[useJoystick]') || msg.includes('[useMapperInteractions]') || msg.includes('[useButtonClicks]') || msg.includes('[useButtonGestures]') || msg.includes('[DpadCluster]')) {
                setLogs(prev => [msg.substring(0, 100), ...prev].slice(0, 20));
            }
            originalLog(...args);
        };

        return () => {
            console.log = originalLog;
        };
    }, []);

    if (!visible) {
        return (
            <div 
                style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 100000, background: 'rgba(255,0,0,0.5)', color: 'white', padding: '2px 10px', fontSize: '10px', borderRadius: '0 0 5px 5px' }}
                onClick={() => setVisible(true)}
            >
                DEBUG
            </div>
        );
    }

    return (
        <div 
            ref={containerRef}
            style={{ 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                width: '100%', 
                maxHeight: '40%', 
                background: 'rgba(0,0,0,0.85)', 
                color: '#00ff00', 
                fontFamily: 'monospace', 
                fontSize: '10px', 
                zIndex: 100000, 
                padding: '10px',
                overflowY: 'auto',
                borderBottom: '1px solid #00ff00',
                pointerEvents: 'auto'
            }}
            onClick={() => setVisible(false)}
        >
            <div style={{ fontWeight: 'bold', marginBottom: '5px', borderBottom: '1px solid #555' }}>
                IN-APP DEBUG CONSOLE (Click to Close)
                <button onClick={(e) => { e.stopPropagation(); setLogs([]); }} style={{ float: 'right', background: '#333', color: 'white', border: '1px solid #777' }}>Clear</button>
            </div>
            {logs.map((log, i) => (
                <div key={i} style={{ marginBottom: '2px' }}>{log}</div>
            ))}
        </div>
    );
};
