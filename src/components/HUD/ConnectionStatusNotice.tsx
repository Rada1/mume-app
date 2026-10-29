/** @file ConnectionStatusNotice.tsx — Visible connection status and reconnect control. */
import React from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import './ConnectionStatusNotice.css';

// --- Connection feedback ---
export const ConnectionStatusNotice: React.FC = () => {
    const { status, sessionMode, telnet } = useGame();
    if (status === 'connected' || sessionMode === 'replay') return null;

    const connecting = status === 'connecting';
    return <div className="connection-status-notice" role="status" aria-live="polite">
        <WifiOff size={17} aria-hidden="true" />
        <span className="connection-status-notice__message">
            <strong>{connecting ? 'Connecting' : 'Disconnected'}</strong>
            <span>{connecting ? 'Connecting to MUME…' : 'Not connected to MUME'}</span>
        </span>
        {!connecting && <button type="button" onClick={() => telnet.connect()}>
            <RefreshCw size={14} aria-hidden="true" /> Reconnect
        </button>}
    </div>;
};
