import React, { useState } from 'react';
import { X, Users, RefreshCw } from 'lucide-react';
import { useGame, useUI } from '../../context/GameContext';
import { MemberRow } from './MemberRow';
import './CharacterDrawer.css';
import './PlayersDrawer.css';

interface PlayersDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
}

export const PlayersDrawer: React.FC<PlayersDrawerProps> = ({ isOpen, onClose, executeCommand: propsExecuteCommand }) => {
    const [activeTab, setActiveTab] = useState<'group' | 'online' | 'nearby'>('group');
    const { whoList, whereList, groupMembers, triggerHaptic, executeCommand: contextExecuteCommand } = useGame();
    const { setPopoverState } = useUI();

    const executeCommand = contextExecuteCommand || propsExecuteCommand;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
    };

    const handleRefresh = (e: React.MouseEvent) => {
        e.stopPropagation();
        triggerHaptic(20);
        executeCommand('who', true, true, true, true);
        setTimeout(() => executeCommand('where', true, true, true, true), 150);
    };

    const handlePlayerClick = (e: React.MouseEvent, name: string) => {
        e.stopPropagation();
        triggerHaptic(15);
        setPopoverState({
            x: e.clientX,
            y: e.clientY,
            setId: 'inlineplayer',
            context: name,
            type: undefined,
            menuDisplay: 'list'
        });
    };

    return (
        <div
            className={`character-drawer-overlay ${isOpen ? 'open' : ''}`}
            onClick={handleBackdropClick}
        >
            <div
                className={`character-drawer-content ${isOpen ? 'open' : ''}`}
                onClick={(e) => { if (e.target === e.currentTarget) onClose(); else e.stopPropagation(); }}
            >
                <div className="drawer-header" style={{ pointerEvents: 'auto' }}>
                    <div className="drawer-tabs">
                        <button
                            className={`drawer-tab ${activeTab === 'group' ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); setActiveTab('group'); }}
                        >
                            <Users size={14} />
                            <span>Group</span>
                        </button>
                        <button
                            className={`drawer-tab ${activeTab === 'online' ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); setActiveTab('online'); }}
                        >
                            <span>Online</span>
                        </button>
                        <button
                            className={`drawer-tab ${activeTab === 'nearby' ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); setActiveTab('nearby'); }}
                        >
                            <span>Nearby</span>
                        </button>
                    </div>
                    <button
                        style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '4px', marginRight: '4px' }}
                        onClick={handleRefresh}
                        title="Refresh"
                    >
                        <RefreshCw size={14} />
                    </button>
                    <button className="close-button" onClick={(e) => { e.stopPropagation(); onClose(); }}>
                        <X size={18} />
                    </button>
                </div>

                <div className="drawer-body" style={{ pointerEvents: 'auto' }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
                    {activeTab === 'group' ? (
                        <div style={{ padding: '8px 0' }}>
                            {groupMembers.length > 0 ? (
                                groupMembers.map(m => <MemberRow key={m.id} member={m} />)
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px', opacity: 0.3 }}>
                                    <Users size={32} style={{ marginBottom: '10px' }} />
                                    <p style={{ fontSize: '0.8rem' }}>Not in a group.</p>
                                </div>
                            )}
                        </div>
                    ) : activeTab === 'online' ? (
                        <div className="players-chip-grid">
                            {whoList.length > 0 ? (
                                whoList.map((name, i) => (
                                    <span
                                        key={i}
                                        className="player-chip"
                                        onClick={(e) => handlePlayerClick(e, name)}
                                    >
                                        {name}
                                    </span>
                                ))
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px', opacity: 0.3, width: '100%' }}>
                                    <p style={{ fontSize: '0.8rem' }}>No data — tap refresh to load.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ padding: '0 8px' }}>
                            {whereList.length > 0 ? (
                                whereList.map((entry, i) => (
                                    <div key={i} className="where-entry">
                                        <span
                                            className="player-chip"
                                            onClick={(e) => handlePlayerClick(e, entry.name)}
                                        >
                                            {entry.name}
                                        </span>
                                        <span className="where-room">{entry.room}</span>
                                    </div>
                                ))
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px', opacity: 0.3 }}>
                                    <p style={{ fontSize: '0.8rem' }}>No data — tap refresh to load.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
