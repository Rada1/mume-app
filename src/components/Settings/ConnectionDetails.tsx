/**
 * @file ConnectionDetails.tsx
 * @description Component managing MUD connection settings (Host, Port, Account, Auto-Connect).
 */

import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

interface ConnectionDetailsProps {
    connectionUrl: string;
    setConnectionUrl: (val: string) => void;
    status: string;
    connect: () => void;
    autoConnect: boolean;
    setAutoConnect: (val: boolean) => void;
    loginName: string;
    setLoginName: (val: string) => void;
    loginPassword: string;
    setLoginPassword: (val: string) => void;
}

export const ConnectionDetails: React.FC<ConnectionDetailsProps> = ({
    connectionUrl,
    setConnectionUrl,
    status,
    connect,
    autoConnect,
    setAutoConnect,
    loginName,
    setLoginName,
    loginPassword,
    setLoginPassword,
}) => {
    let protocol = 'wss:';
    let host = '';
    let port = '';
    let path = '/';
    try {
        const url = new URL(connectionUrl);
        protocol = url.protocol;
        host = url.hostname;
        port = url.port;
        path = url.pathname + url.search;
    } catch (e) { }

    const updateUrl = (parts: { protocol?: string, host?: string, port?: string, path?: string }) => {
        const p = parts.protocol ?? protocol;
        const h = parts.host ?? host;
        const pt = parts.port ?? port;
        const pa = parts.path ?? path;
        const portStr = pt ? `:${pt}` : '';
        const pathStr = pa.startsWith('/') ? pa : `/${pa}`;
        setConnectionUrl(`${p}//${h}${portStr}${pathStr}`);
    };

    return (
        <div className="setting-group" style={{ border: '1px solid var(--border-modal)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <label className="setting-label" style={{ color: 'var(--accent)', fontWeight: 'bold', margin: 0 }}>Connection Details</label>
                <button
                    className={`btn-secondary ${status}`}
                    onClick={connect}
                    style={{
                        margin: 0,
                        padding: '4px 12px',
                        fontSize: '0.8rem',
                        background: status === 'connected' ? '#16a34a' : 'transparent',
                        borderColor: status === 'connected' ? '#16a34a' : status === 'connecting' ? '#f59e0b' : '#ef4444',
                        color: status === 'connected' ? '#fff' : status === 'connecting' ? '#f59e0b' : '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    {status === 'connected' ? <Wifi size={14} /> : <WifiOff size={14} />}
                    {status.toUpperCase()}
                </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 120px' }}>
                    <label className="setting-label">Protocol</label>
                    <select
                        className="setting-input"
                        value={protocol}
                        onChange={e => updateUrl({ protocol: e.target.value })}
                    >
                        <option value="ws:">ws://</option>
                        <option value="wss:">wss://</option>
                    </select>
                </div>
                <div style={{ flex: '3 1 200px' }}>
                    <label className="setting-label">Host / Domain</label>
                    <input
                        className="setting-input"
                        value={host}
                        placeholder="mume.org"
                        onChange={e => updateUrl({ host: e.target.value })}
                    />
                </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 100px' }}>
                    <label className="setting-label">Port</label>
                    <input
                        className="setting-input"
                        value={port}
                        placeholder="443"
                        onChange={e => updateUrl({ port: e.target.value })}
                    />
                </div>
                <div style={{ flex: '3 1 200px' }}>
                    <label className="setting-label">Path</label>
                    <input
                        className="setting-input"
                        value={path}
                        placeholder="/ws-play/"
                        onChange={e => updateUrl({ path: e.target.value })}
                    />
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label className="setting-label" style={{ color: 'var(--text-primary)', fontWeight: 'bold', margin: 0 }}>Auto-Connect</label>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim, #94a3b8)', marginTop: '4px' }}>Automatically connect on page load or refresh.</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: autoConnect ? 'var(--accent)' : '#64748b' }}>{autoConnect ? 'ON' : 'OFF'}</span>
                    <div
                        onClick={() => setAutoConnect(!autoConnect)}
                        style={{
                            width: '40px',
                            height: '20px',
                            background: autoConnect ? 'var(--accent)' : 'var(--input-bg)',
                            borderRadius: '20px',
                            position: 'relative',
                            cursor: 'pointer',
                            transition: 'all 0.3s'
                        }}
                    >
                        <div style={{
                            width: '16px',
                            height: '16px',
                            background: '#fff',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '2px',
                            left: autoConnect ? '22px' : '2px',
                            transition: 'all 0.3s'
                        }} />
                    </div>
                </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); connect(); }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 180px' }}>
                        <label htmlFor="character-name" className="setting-label">Character Name</label>
                        <input
                            id="character-name"
                            name="username"
                            autoComplete="username"
                            className="setting-input"
                            value={loginName}
                            placeholder="Character"
                            onChange={e => setLoginName(e.target.value)}
                        />
                    </div>
                    <div style={{ flex: '1 1 180px' }}>
                        <label htmlFor="character-password" className="setting-label">Password</label>
                        <input
                            id="character-password"
                            type="password"
                            name="password"
                            autoComplete="current-password"
                            className="setting-input"
                            value={loginPassword}
                            placeholder="********"
                            onChange={e => setLoginPassword(e.target.value)}
                        />
                    </div>
                </div>
                <button type="submit" style={{ display: 'none' }} aria-hidden="true" />
            </form>

            <div className="setting-group" style={{ marginTop: '10px', marginBottom: 0 }}>
                <label htmlFor="connection-url-full" className="setting-label">Full URL (Advanced)</label>
                <input
                    id="connection-url-full"
                    name="connection-url-full"
                    className="setting-input"
                    value={connectionUrl}
                    onChange={(e) => setConnectionUrl(e.target.value)}
                    style={{ fontSize: '0.8rem', opacity: 0.7 }}
                />
                <span className="setting-helper">Note: Browser clients require a WebSocket (ws/wss) bridge.</span>
            </div>
        </div>
    );
};
