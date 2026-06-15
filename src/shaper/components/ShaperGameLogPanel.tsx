/**
 * @file ShaperGameLogPanel.tsx
 * @description Side panel rendering the live MUD message feed and a command input for playtesting.
 */

import React, { useEffect, useRef } from 'react';
import { Terminal, X } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useInputStore } from '../../stores/useInputStore';
import MessageLog from '../../components/Messages/MessageLog';
import './ShaperGameLogPanel.css';

interface ShaperGameLogPanelProps {
    onClose: () => void;
}

export const ShaperGameLogPanel: React.FC<ShaperGameLogPanelProps> = ({ onClose }) => {
    const {
        status,
        characterName,
        executeCommand,
        handleLogClick,
        handleLogPointerDown,
        handleLogPointerUp
    } = useGame() as any;

    const input = useInputStore(s => s.input);
    const setInput = useInputStore(s => s.setInput);
    const addToHistory = useInputStore(s => s.addToHistory);
    const navigateHistory = useInputStore(s => s.navigateHistory);

    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus input when the panel is shown or clicked
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const cmd = input.trim();
        if (!cmd) return;
        executeCommand(cmd);
        addToHistory(cmd);
        setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            navigateHistory('up');
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            navigateHistory('down');
        }
    };

    const isConnected = status === 'connected';

    return (
        <div className="shaper-gamelog-panel" onClick={() => inputRef.current?.focus()}>
            <div className="shaper-gamelog-header">
                <div className="shaper-gamelog-title">
                    <Terminal size={14} className="text-amber-400" />
                    <span>MUD Feed</span>
                    {characterName && <span className="shaper-gamelog-char">({characterName})</span>}
                </div>
                <div className="flex items-center gap-2">
                    <span 
                        className={`shaper-gamelog-status-dot ${isConnected ? 'connected' : 'disconnected'}`} 
                        title={isConnected ? 'Connected' : 'Disconnected'}
                    />
                    <button 
                        type="button" 
                        className="shaper-gamelog-close-btn" 
                        onClick={onClose} 
                        title="Close MUD Feed"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            <div className="shaper-gamelog-body">
                <MessageLog
                    onLogClick={handleLogClick || (() => {})}
                    onPointerDown={handleLogPointerDown}
                    onPointerUp={handleLogPointerUp}
                />
            </div>

            <div className="shaper-gamelog-footer">
                <form onSubmit={handleFormSubmit} className="shaper-gamelog-form">
                    <span className="shaper-gamelog-prompt">&gt;</span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a command..."
                        className="shaper-gamelog-input"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                    />
                </form>
            </div>
        </div>
    );
};
