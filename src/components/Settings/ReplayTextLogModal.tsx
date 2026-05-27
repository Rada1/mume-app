/**
 * @file ReplayTextLogModal.tsx
 * @description Full text view for a recorded replay session.
 */

import React, { useMemo } from 'react';
import { Copy, Play, X } from 'lucide-react';
import type { StoredSession } from '../../utils/storage/sessionDb';
import { sessionLogToText, sessionLogToHtml } from '../../utils/replayText';

interface ReplayTextLogModalProps {
    session: StoredSession;
    onClose: () => void;
    onWatch: (session: StoredSession) => void;
}

const buttonStyle: React.CSSProperties = {
    border: '1px solid rgba(255,255,255,0.12)',
    color: 'var(--text-primary)',
    background: 'rgba(255,255,255,0.06)',
    padding: '8px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.82rem',
};

// --- Logic Section ---
const ReplayTextLogModal: React.FC<ReplayTextLogModalProps> = ({ session, onClose, onWatch }) => {
    const textLog = useMemo(() => sessionLogToText(session), [session]);
    const textLogHtml = useMemo(() => sessionLogToHtml(session), [session]);
    const title = session.metadata.character || 'Unknown Scout';

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(textLog);
        } catch (error) {
            console.error('[ReplayTextLogModal] Failed to copy log:', error);
        }
    };

    return (
        <div className="modal-overlay" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal large" onClick={(e) => e.stopPropagation()} style={{ height: '85dvh' }}>
                <div className="modal-header" style={{ marginBottom: '12px' }}>
                    <div>
                        <div className="modal-title">{title}</div>
                        <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem', marginTop: '3px' }}>
                            Plain text log
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
                        aria-label="Close text log"
                    >
                        <X size={20} />
                    </button>
                </div>

                <pre
                    style={{
                        flex: 1,
                        minHeight: 0,
                        overflow: 'auto',
                        margin: 0,
                        padding: '14px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        background: 'rgba(0,0,0,0.35)',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: '0.82rem',
                        lineHeight: 1.45,
                        whiteSpace: 'pre-wrap',
                        userSelect: 'text',
                    }}
                    dangerouslySetInnerHTML={{ __html: textLogHtml || 'No readable text entries found in this replay.' }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                    <button onClick={handleCopy} style={buttonStyle}>
                        <Copy size={14} /> Copy
                    </button>
                    <button
                        onClick={() => onWatch(session)}
                        style={{ ...buttonStyle, background: 'var(--accent)', color: '#000', fontWeight: 700 }}
                    >
                        <Play size={14} /> Watch Replay
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReplayTextLogModal;
