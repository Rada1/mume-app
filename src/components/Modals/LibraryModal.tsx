/**
 * @file LibraryModal.tsx
 * @description Window overlay for browsing and managing internally saved session logs.
 */

import React, { useEffect, useState } from 'react';
import { Play, Download, Trash2, Calendar, User, FileText, ChevronRight, X, Clock } from 'lucide-react';
import { getAllSessionsFromDb, deleteSessionFromDb, StoredSession } from '../../utils/storage/sessionDb';
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

    const loadSessions = async () => {
        setIsLoading(true);
        try {
            const data = await getAllSessionsFromDb();
            setSessions(data);
        } catch (e) {
            console.error('[Library] Failed to load sessions:', e);
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
        <div className="modal-overlay" onClick={onClose}>
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
