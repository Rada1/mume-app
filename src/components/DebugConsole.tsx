import React, { useState, useEffect } from 'react';

// A simple singleton to collect logs globally
const logHistory: string[] = [];
const listeners: ((logs: string[]) => void)[] = [];

const originalLog = console.log;
console.log = (...args: any[]) => {
    const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    logHistory.push(`[${new Date().toLocaleTimeString()}] ${message}`);
    if (logHistory.length > 50) logHistory.shift();
    listeners.forEach(l => l([...logHistory]));
    originalLog.apply(console, args);
};

export const DebugConsole: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [logs, setLogs] = useState<string[]>(logHistory);

    useEffect(() => {
        const listener = (newLogs: string[]) => setLogs(newLogs);
        listeners.push(listener);
        return () => {
            const index = listeners.indexOf(listener);
            if (index > -1) listeners.splice(index, 1);
        };
    }, []);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.95)',
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            padding: '20px',
            fontFamily: 'monospace',
            color: '#0f0'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
                <h2 style={{ margin: 0 }}>Debug Logs</h2>
                <button onClick={onClose} style={{ background: '#f44', border: 'none', color: '#fff', padding: '5px 15px', borderRadius: '4px' }}>Close</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                {logs.length === 0 ? 'No logs captured yet...' : logs.map((log, i) => (
                    <div key={i} style={{ marginBottom: '4px', borderBottom: '1px solid #222', paddingBottom: '2px' }}>
                        {log}
                    </div>
                )).reverse()}
            </div>
            <button 
                onClick={() => { logHistory.length = 0; setLogs([]); }}
                style={{ marginTop: '10px', background: '#333', border: '1px solid #555', color: '#ccc', padding: '8px' }}
            >
                Clear Logs
            </button>
        </div>
    );
};
