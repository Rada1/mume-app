/**
 * @file ReplaySettings.tsx
 * @description Settings panel for loading, watching, exporting, and reading replay sessions.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronRight, Clock, Download, FileText, FolderOpen, Trash2, User } from 'lucide-react';
import { useGame, useUI } from '../../context/GameContext';
import { deleteLibrary, deleteSessionFromDb, getAllSessionsFromDb, getStorageUsage, StoredSession } from '../../utils/storage/sessionDb';
import ReplayTextLogModal from './ReplayTextLogModal';
import { resolveSubraceBanner } from '../../utils/subraceBanners';

// --- Helper Functions ---
const getSessionRaceAndSubrace = (session: StoredSession): { race?: string; subrace?: string } => {
    if (session.metadata?.race || session.metadata?.subrace) {
        return { race: session.metadata.race, subrace: session.metadata.subrace };
    }
    for (const entry of session.log) {
        if (entry.typ === 'gmcp' && entry.d) {
            const { pkg, data } = entry.d;
            if (pkg === 'Char.Info' || pkg === 'Char.Status' || pkg === 'Char.Vitals') {
                try {
                    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
                    if (parsed && (parsed.race || parsed.subrace)) {
                        return { race: parsed.race, subrace: parsed.subrace };
                    }
                } catch (_) {}
            }
        }
    }
    return {};
};

const SessionAvatar: React.FC<{ session: StoredSession }> = ({ session }) => {
    const { race, subrace } = getSessionRaceAndSubrace(session);
    const asset = resolveSubraceBanner(race, subrace);
    const [imgSrc, setImgSrc] = useState<string | null>(asset?.src || null);

    useEffect(() => {
        setImgSrc(asset?.src || null);
    }, [asset]);

    const handleError = () => {
        if (asset && imgSrc === asset.src && asset.fallbackSrc) {
            setImgSrc(asset.fallbackSrc);
        } else {
            setImgSrc(null);
        }
    };

    if (imgSrc) {
        return (
            <img
                src={imgSrc}
                alt={asset?.label || 'Emblem'}
                onError={handleError}
                style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    display: 'block',
                }}
            />
        );
    }

    return <User size={16} />;
};

const ReplaySettings: React.FC = () => {
    const { triggerHaptic } = useGame();
    const { replayer, setIsSettingsOpen } = useUI();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [sessions, setSessions] = useState<StoredSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [storageInfo, setStorageInfo] = useState<{ usage: string; quota: string } | null>(null);
    const [textLogSession, setTextLogSession] = useState<StoredSession | null>(null);

    // --- Logic Section ---
    const loadSessions = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getAllSessionsFromDb();
            setSessions(data);
            const estimate = await getStorageUsage();
            if (estimate && estimate.usage !== undefined && estimate.quota !== undefined) {
                setStorageInfo({
                    usage: (estimate.usage / (1024 * 1024)).toFixed(1) + 'MB',
                    quota: (estimate.quota / (1024 * 1024)).toFixed(1) + 'MB',
                });
            }
        } catch (e: any) {
            setError(e.message || 'Failed to access local storage library.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadSessions(); }, []);

    const handleReplayUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                if (event.target?.result) {
                    const log = JSON.parse(event.target.result as string);
                    replayer.loadLog(log);
                    setIsSettingsOpen(false);
                }
            } catch (err) {
                console.error('[ReplaySettings] Failed to parse MUME log:', err);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handlePlay = (session: StoredSession) => {
        triggerHaptic(20);
        replayer.loadLog(session);
        replayer.setIsVisible(true);
        replayer.play();
        setIsSettingsOpen(false);
    };

    const handleViewText = (session: StoredSession, e: React.MouseEvent) => {
        e.stopPropagation();
        triggerHaptic(10);
        setTextLogSession(session);
    };

    const handleDelete = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this recording?')) return;
        triggerHaptic(10);
        try {
            await deleteSessionFromDb(id);
            loadSessions();
        } catch (e) {
            console.error('[ReplaySettings] Failed to delete session:', e);
        }
    };

    const handleExport = (session: StoredSession, e: React.MouseEvent) => {
        e.stopPropagation();
        triggerHaptic(15);
        const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mume-log-${session.startTime?.replace(/[:.]/g, '-') ?? Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleClearAll = async () => {
        const msg = error
            ? 'Your storage appears to be full or corrupted. Performing a HARD RESET will wipe all local recordings but may fix the issue. Continue?'
            : 'Are you sure you want to PERMANENTLY DELETE ALL recordings from the local library?';
        if (!window.confirm(msg)) return;
        triggerHaptic(50);
        try {
            await deleteLibrary();
            loadSessions();
        } catch (e: any) {
            alert('Failed to clear library: ' + e.message);
        }
    };

    const formatTime = (isoString: string) =>
        new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const formatDate = (isoString: string) =>
        new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {textLogSession && <ReplayTextLogModal session={textLogSession} onClose={() => setTextLogSession(null)} onWatch={handlePlay} />}

            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".mume-log,.json"
                onChange={handleReplayUpload}
            />

            {/* Load from file */}
            <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Load Replay</div>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'var(--text-primary)',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        width: '100%',
                        fontSize: '0.9rem',
                    }}
                >
                    <FolderOpen size={16} />
                    <span>Open Replay File (.mume-log)</span>
                </button>
            </div>

            {/* Session library */}
            <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Session Library
                    {storageInfo && (
                        <span style={{ marginLeft: '8px', opacity: 0.6 }}>
                            {storageInfo.usage} / {storageInfo.quota}
                        </span>
                    )}
                </div>

                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)' }}>Loading archives...</div>
                ) : error ? (
                    <div style={{ textAlign: 'center', padding: '30px 20px', color: '#f87171' }}>
                        <Trash2 size={40} style={{ marginBottom: '12px', opacity: 0.5 }} />
                        <p style={{ fontWeight: 'bold' }}>Storage Error</p>
                        <p style={{ fontSize: '0.85rem', marginBottom: '16px' }}>{error}</p>
                        <button
                            onClick={handleClearAll}
                            style={{ background: 'var(--accent)', color: '#000', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                            Force Reset Library
                        </button>
                    </div>
                ) : sessions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)' }}>
                        <FileText size={40} style={{ marginBottom: '12px', opacity: 0.2 }} />
                        <p>No internal logs found.</p>
                        <p style={{ fontSize: '0.85rem' }}>Sessions will appear here automatically after you finish playing.</p>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {sessions.map((session) => (
                                <div
                                    key={session.id}
                                    className="library-item"
                                    onClick={() => handlePlay(session)}
                                    style={{
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        borderRadius: '10px',
                                        padding: '10px 12px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{
                                                width: '32px', height: '32px', borderRadius: '16px',
                                                background: 'rgba(var(--accent-rgb), 0.1)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: 'var(--accent)',
                                                overflow: 'hidden',
                                                flexShrink: 0,
                                            }}>
                                                <SessionAvatar session={session} />
                                            </div>
                                            <div>
                                                <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.95rem' }}>
                                                    {session.metadata.character || 'Unknown Scout'}
                                                </div>
                                                <div style={{ color: 'var(--text-dim)', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Calendar size={11} /> {formatDate(session.startTime)}
                                                    <Clock size={11} style={{ marginLeft: '4px' }} /> {formatTime(session.startTime)}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button onClick={(e) => handleExport(session, e)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-dim)', padding: '5px', borderRadius: '6px', cursor: 'pointer' }} title="Export to file">
                                                <Download size={14} />
                                            </button>
                                            <button onClick={(e) => handleDelete(session.id!, e)} style={{ background: 'rgba(248, 113, 113, 0.1)', border: 'none', color: '#f87171', padding: '5px', borderRadius: '6px', cursor: 'pointer' }} title="Delete">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '42px' }}>
                                        <div style={{ color: 'var(--text-dim)', opacity: 0.5, fontSize: '0.68rem' }}>
                                            {session.log.length} events
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <button
                                                onClick={(e) => handleViewText(session, e)}
                                                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-dim)', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem' }}
                                                title="View as text log"
                                            >
                                                <FileText size={13} /> Text
                                            </button>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent)', fontSize: '0.8rem' }}>
                                                Replay <ChevronRight size={13} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={handleClearAll}
                                style={{
                                    background: 'none',
                                    border: '1px solid rgba(248, 113, 113, 0.3)',
                                    color: '#f87171',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                <Trash2 size={11} /> Clear All
                            </button>
                        </div>
                    </>
                )}
            </div>

            <style>{`
                .library-item:hover { background: rgba(255,255,255,0.05) !important; border-color: rgba(255,255,255,0.1) !important; }
                .library-item:active { transform: scale(0.995); background: rgba(255,255,255,0.07) !important; }
            `}</style>
        </div>
    );
};

export default ReplaySettings;
