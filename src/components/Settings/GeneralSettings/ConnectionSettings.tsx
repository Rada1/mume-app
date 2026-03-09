import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import MASTER_SETTINGS from '../../../constants/mastersettings.json';

interface ConnectionSettingsProps {
    connectionUrl: string;
    setConnectionUrl: (url: string) => void;
    status: string;
    connect: () => void;
}

const ConnectionSettings: React.FC<ConnectionSettingsProps> = ({ connectionUrl, setConnectionUrl, status, connect }) => {
    const [protocol, setProtocol] = useState('wss:');
    const [host, setHost] = useState('');
    const [port, setPort] = useState('');
    const [path, setPath] = useState('');

    useEffect(() => {
        try {
            if (connectionUrl) {
                const url = new URL(connectionUrl);
                setProtocol(url.protocol);
                setHost(url.hostname);
                setPort(url.port);
                setPath(url.pathname);
            }
        } catch (e) {
            console.error('Invalid connection URL:', connectionUrl);
        }
    }, [connectionUrl]);

    const updateUrl = (updates: Partial<{ protocol: string; host: string; port: string; path: string }>) => {
        const p = updates.protocol ?? protocol;
        const h = updates.host ?? host;
        const po = updates.port ?? port;
        const pa = updates.path ?? path;
        const portStr = po ? `:${po}` : '';
        const pathStr = pa.startsWith('/') || !pa ? pa : `/${pa}`;
        setConnectionUrl(`${p}//${h}${portStr}${pathStr}`);
    };

    return (
        <div className="setting-group" style={{ border: '1px solid #333', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <label className="setting-label" style={{ color: 'var(--accent)', fontWeight: 'bold', margin: 0 }}>Connection Details</label>
                <button
                    className={`btn-secondary ${status}`}
                    onClick={connect}
                    style={{
                        margin: 0,
                        padding: '4px 12px',
                        fontSize: '0.8rem',
                        borderColor: status === 'connected' ? 'var(--accent)' : status === 'connecting' ? '#f59e0b' : '#ef4444',
                        color: status === 'connected' ? 'var(--accent)' : status === 'connecting' ? '#f59e0b' : '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    {status === 'connected' ? <Wifi size={14} /> : <WifiOff size={14} />}
                    {status.toUpperCase()}
                </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <div style={{ flex: 1 }}>
                    <label className="setting-label">Protocol</label>
                    <select className="setting-input" value={protocol} onChange={e => updateUrl({ protocol: e.target.value })}>
                        <option value="ws:">ws://</option>
                        <option value="wss:">wss://</option>
                    </select>
                </div>
                <div style={{ flex: 3 }}>
                    <label className="setting-label">Host / Domain</label>
                    <input className="setting-input" value={host} placeholder="mume.org" onChange={e => updateUrl({ host: e.target.value })} />
                </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                    <label className="setting-label">Port (Optional)</label>
                    <input className="setting-input" value={port} placeholder="443" onChange={e => updateUrl({ port: e.target.value })} />
                </div>
                <div style={{ flex: 2 }}>
                    <label className="setting-label">Path (Optional)</label>
                    <input className="setting-input" value={path} placeholder="/ws" onChange={e => updateUrl({ path: e.target.value })} />
                </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button className="btn-secondary" style={{ fontSize: '0.8rem', flex: 1, padding: '8px', background: 'rgba(255,255,255,0.05)' }} onClick={() => setConnectionUrl((MASTER_SETTINGS as any).connectionUrl || 'wss://mume.org/v2/')}>Default WSS</button>
                <button className="btn-secondary" style={{ fontSize: '0.8rem', flex: 1, padding: '8px', background: 'rgba(255,255,255,0.05)' }} onClick={() => setConnectionUrl('wss://mmapper.mume.org:8443/wsproxytls')}>mMapper WSS Proxy</button>
            </div>

            <div className="setting-group" style={{ marginTop: '10px', marginBottom: 0 }}>
                <label className="setting-label" style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '5px', wordBreak: 'break-all' }}>
                    Final URL: <span style={{ color: 'var(--accent)' }}>{connectionUrl}</span>
                </label>
            </div>
        </div>
    );
};

export default ConnectionSettings;
