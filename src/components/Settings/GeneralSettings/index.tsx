import React from 'react';
import { Upload } from 'lucide-react';
import { DEFAULT_BG } from '../../../constants';
import ConnectionSettings from './ConnectionSettings';
import ToggleSwitch from './ToggleSwitch';

interface GeneralSettingsProps {
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
    isMmapperMode: boolean;
    setIsMmapperMode: (val: boolean) => void;
    isNoviceMode: boolean;
    setIsNoviceMode: (val: boolean) => void;
    theme: 'light' | 'dark';
    setTheme: (val: 'light' | 'dark') => void;
    bgImage: string;
    setBgImage: (val: string) => void;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    showDebugEchoes: boolean;
    setShowDebugEchoes: (val: boolean) => void;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({
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
    isMmapperMode,
    setIsMmapperMode,
    isNoviceMode,
    setIsNoviceMode,
    theme,
    setTheme,
    bgImage,
    setBgImage,
    handleFileUpload,
    showDebugEchoes,
    setShowDebugEchoes,
}) => {
    return (
        <>
            <ConnectionSettings connectionUrl={connectionUrl} setConnectionUrl={setConnectionUrl} status={status} connect={connect} />

            <div className="setting-group" style={{ border: '1px solid #333', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <ToggleSwitch
                    label="Auto-Connect"
                    description="Automatically connect on page load or refresh."
                    checked={autoConnect}
                    onChange={() => setAutoConnect(!autoConnect)}
                    color="var(--accent)"
                />

                <ToggleSwitch
                    label="mMapper Proxy/Relay Mode"
                    description="Connects to mMapper WSS instead of MUME direct."
                    checked={isMmapperMode}
                    onChange={() => setIsMmapperMode(!isMmapperMode)}
                    color="var(--accent)"
                    badge="BETA"
                    badgeColor="var(--accent)"
                    badgeTextColor="#000"
                    containerStyle={{ marginBottom: 0 }}
                />

                {isMmapperMode && (
                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '10px', borderRadius: '4px', borderLeft: '3px solid #3b82f6', marginTop: '15px' }}>
                        <div style={{ fontSize: '0.8rem', color: '#93c5fd', lineHeight: '1.4' }}>
                            You are now using the mMapper bridge. You must set your connection host/port above to the bridge URL (e.g. wss://mmapper.mume.org:8443/wsproxytls).
                            <br /><br />
                            Note: The bridge will auto-detect mMapper on Port 900 or 4242.
                        </div>
                    </div>
                )}
            </div>

            <div className="setting-group" style={{ border: '1px solid rgba(139, 92, 246, 0.3)', background: 'rgba(139, 92, 246, 0.05)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <ToggleSwitch
                    label="Novice Mode"
                    description="Smart command parsing for easier inputs."
                    checked={isNoviceMode}
                    onChange={() => setIsNoviceMode(!isNoviceMode)}
                    color="#8b5cf6"
                    activeText="ACTIVE"
                    badge="NEW"
                    badgeColor="#8b5cf6"
                    containerStyle={{ marginBottom: 0 }}
                />
            </div>

            <div className="setting-group" style={{ border: '1px solid rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.05)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <ToggleSwitch
                    label="Debug Messages"
                    description="Show technical client echoes (e.g. Mapper coordinates)."
                    checked={showDebugEchoes}
                    onChange={() => setShowDebugEchoes(!showDebugEchoes)}
                    color="#f59e0b"
                    badge="DEV"
                    badgeColor="#f59e0b"
                    badgeTextColor="#000"
                    containerStyle={{ marginBottom: 0 }}
                />
            </div>

            <div className="setting-group" style={{ border: '1px solid var(--border-color)', background: 'var(--bg-panel)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <label className="setting-label" style={{ margin: 0, fontWeight: 'bold' }}>Color Theme</label>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>Client-wide interface theme.</div>
                    </div>
                    <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px', gap: '4px' }}>
                        <button
                            className="btn-secondary"
                            onClick={() => setTheme('dark')}
                            style={{
                                margin: 0,
                                background: theme === 'dark' ? 'var(--accent)' : 'transparent',
                                color: theme === 'dark' ? '#000' : '#fff',
                                border: 'none',
                                padding: '4px 12px'
                            }}
                        >
                            Dark
                        </button>
                        <button
                            className="btn-secondary"
                            onClick={() => setTheme('light')}
                            style={{
                                margin: 0,
                                background: theme === 'light' ? 'var(--accent)' : 'transparent',
                                color: theme === 'light' ? '#000' : '#fff',
                                border: 'none',
                                padding: '4px 12px'
                            }}
                        >
                            Light
                        </button>
                    </div>
                </div>
            </div>

            <div className="setting-group" style={{ border: '1px solid var(--border-color)', background: 'var(--bg-panel)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <label className="setting-label" style={{ fontWeight: 'bold' }}>Auto-Login (Optional)</label>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '15px' }}>
                    If provided, the client will automatically send these credentials when prompted by the MUME server.
                </div>
                <form>
                    <input type="text" style={{ display: 'none' }} autoComplete="username" />
                    <input type="password" style={{ display: 'none' }} autoComplete="current-password" />

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ flex: 1 }}>
                            <label className="setting-label">Account / Character Name</label>
                            <input
                                type="text"
                                className="setting-input"
                                value={loginName}
                                autoComplete="username"
                                onChange={e => setLoginName(e.target.value)}
                                placeholder="Name"
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="setting-label">Password</label>
                            <input
                                type="password"
                                className="setting-input"
                                value={loginPassword}
                                autoComplete="current-password"
                                onChange={e => setLoginPassword(e.target.value)}
                                placeholder="Password"
                            />
                        </div>
                    </div>
                </form>
            </div>

            <div className="setting-group" style={{ border: '1px solid var(--border-color)', background: 'var(--bg-panel)', padding: '15px', borderRadius: '8px' }}>
                <label className="setting-label" style={{ fontWeight: 'bold' }}>Custom Background Image</label>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '15px' }}>
                    Upload an image to replace the default background.
                </div>
                {bgImage && (
                    <div style={{
                        width: '100%',
                        height: '100px',
                        backgroundImage: `url(${bgImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        borderRadius: '8px',
                        marginBottom: '15px',
                        border: '1px solid var(--border-color)'
                    }} />
                )}
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="file"
                        id="bg-upload"
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                        accept="image/*"
                    />
                    <label htmlFor="bg-upload" className="btn-secondary" style={{ marginTop: 0, width: 'auto' }}>
                        <Upload size={16} /> Upload
                    </label>
                    <button className="btn-secondary" style={{ marginTop: 0, width: 'auto' }} onClick={() => setBgImage("")}>
                        Clear
                    </button>
                    <button className="btn-secondary" style={{ marginTop: 0, width: 'auto' }} onClick={() => setBgImage(DEFAULT_BG)}>
                        Reset
                    </button>
                </div>
            </div>
        </>
    );
};

export default GeneralSettings;
