/**
 * @file LibraryModal.tsx
 * @description Window overlay for browsing and managing internally saved session logs.
 */

import React, { useEffect, useState } from 'react';
import { Play, Download, Trash2, Calendar, User, FileText, ChevronRight, X, Clock } from 'lucide-react';
import { getAllSessionsFromDb, deleteSessionFromDb, StoredSession, deleteLibrary, getStorageUsage } from '../../utils/storage/sessionDb';
import { useGame, useUI } from '../../context/GameContext';

interface LibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const LibraryModal: React.FC<LibraryModalProps> = ({ isOpen, onClose }) => {
    const { triggerHaptic, saveLog } = useGame();
    const { replayer } = useUI();
    const [sessions, setSessions] = useState<StoredSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [storageInfo, setStorageInfo] = useState<{ usage: string, quota: string } | null>(null);

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
                    quota: (estimate.quota / (1024 * 1024)).toFixed(1) + 'MB'
                });
            }
        } catch (e: any) {
            console.error('[Library] Failed to load sessions:', e);
            setError(e.message || 'Failed to access local storage library.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadSessions();
        }
    }, [isOpen]);

    const handlePlay = (session: StoredSession) => {
        triggerHaptic(20);
        replayer.loadLog(session);
        replayer.setIsVisible(true);
        replayer.play();
        onClose();
    };

    const handleDelete = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this recording?')) return;
        
        triggerHaptic(10);
        try {
            await deleteSessionFromDb(id);
            loadSessions();
        } catch (e) {
            console.error('[Library] Failed to delete session:', e);
        }
    };

    const handleExport = (session: StoredSession, e: React.MouseEvent) => {
        e.stopPropagation();
        triggerHaptic(15);
        saveLog(session);
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

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    };

    if (!isOpen) return null;

    return (
        <div 
            className="modal-overlay" 
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className="modal large" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={20} color="var(--accent)" />
                        <span>Session Library</span>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-body">
                    {isLoading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>Loading archives...</div>
                    ) : error ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#f87171' }}>
                            <Trash2 size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                            <p style={{ fontWeight: 'bold' }}>Storage Error</p>
                            <p style={{ fontSize: '0.85rem', marginBottom: '20px' }}>{error}</p>
                            <button 
                                onClick={handleClearAll}
                                style={{ 
                                    background: 'var(--accent)', 
                                    color: '#000', 
                                    border: 'none', 
                                    padding: '8px 16px', 
                                    borderRadius: '8px', 
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                Force Reset Library
                            </button>
                        </div>
                    ) : sessions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)' }}>
                            <FileText size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
                            <p>No internal logs found.</p>
                            <p style={{ fontSize: '0.85rem' }}>Your sessions will automatically appear here once you finish playing.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {sessions.map((session) => (
                                <div 
                                    key={session.id} 
                                    className="library-item"
                                    onClick={() => handlePlay(session)}
                                    style={{
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        borderRadius: '12px',
                                        padding: '12px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ 
                                                width: '36px', 
                                                height: '36px', 
                                                borderRadius: '18px', 
                                                background: 'rgba(var(--accent-rgb), 0.1)', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center',
                                                color: 'var(--accent)'
                                            }}>
                                                <User size={18} />
                                            </div>
                                            <div>
                                                <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '1rem' }}>
                                                    {session.metadata.character || 'Unknown Scout'}
                                                </div>
                                                <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Calendar size={12} /> {formatDate(session.startTime)}
                                                    <Clock size={12} style={{ marginLeft: '4px' }} /> {formatTime(session.startTime)}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button 
                                                onClick={(e) => handleExport(session, e)}
                                                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-dim)', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                                                title="Export to file"
                                            >
                                                <Download size={16} />
                                            </button>
                                            <button 
                                                onClick={(e) => handleDelete(session.id!, e)}
                                                style={{ background: 'rgba(248, 113, 113, 0.1)', border: 'none', color: '#f87171', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingLeft: '46px' }}>
                                        <div style={{ color: 'var(--text-dim)', opacity: 0.5, fontSize: '0.7rem' }}>
                                            {session.log.length} events recorded
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent)', fontSize: '0.85rem' }}>
                                            Replay <ChevronRight size={14} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="modal-footer" style={{ 
                    padding: '12px 20px', 
                    borderTop: '1px solid rgba(255,255,255,0.05)', 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(0,0,0,0.2)'
                }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        {storageInfo && `Usage: ${storageInfo.usage} / ${storageInfo.quota}`}
                    </div>
                    {sessions.length > 0 && (
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
                                gap: '6px'
                            }}
                        >
                            <Trash2 size={12} /> Clear All
                        </button>
                    )}
                </div>
            </div>

            <style>{`
                .library-item:hover {
                    background: rgba(255,255,255,0.05) !important;
                    border-color: rgba(255,255,255,0.1) !important;
                }
                .library-item:active {
                    transform: scale(0.995);
                    background: rgba(255,255,255,0.07) !important;
                }
            `}</style>
        </div>
    );
};
