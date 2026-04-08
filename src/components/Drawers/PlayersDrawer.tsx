import React, { useState, useRef } from 'react';
import { X, Users, RefreshCw, Star } from 'lucide-react';
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
    const { whoList, whereList, groupMembers, triggerHaptic, favorites, setFavorites, executeCommand: contextExecuteCommand } = useGame();
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
        // Extract base name for command context (remove <C>, [A] etc)
        const baseName = name.replace(/^[<\[]\w+[>\]]\s*/, '').split(/\s+/)[0];
        setPopoverState({
            x: e.clientX,
            y: e.clientY,
            setId: 'inlineplayer',
            context: baseName,
            type: undefined,
            menuDisplay: 'list'
        });
    };

    const getInternalName = (name: string) => {
        // If it's a piped name (display|internal), take the internal part
        const parts = name.split('|');
        const cleanName = parts.length > 1 ? parts[1] : parts[0];
        // Strip out [Arnor], <C> etc
        return cleanName.replace(/^[<\[]\w+[>\]]\s*/, '').split(/\s+/)[0].toLowerCase();
    };

    const toggleFavorite = (e: React.MouseEvent, name: string) => {
        e.stopPropagation();
        triggerHaptic(25);
        const internalName = getInternalName(name);
        if (!internalName) return;

        setFavorites(prev => {
            const current = prev || [];
            if (current.includes(internalName)) {
                return current.filter(f => f !== internalName);
            }
            return [...current, internalName];
        });
    };

    const isFav = (name: string) => {
        const internalName = getInternalName(name);
        return favorites && favorites.includes(internalName);
    };

    const PlayerRow = ({ name, isFavorite, subtitle }: { name: string, isFavorite: boolean, subtitle?: string }) => {
        const [htmlDisplay, baseName] = name.includes('|') ? name.split('|') : [name, name];
        // Strip ansiConvert inline color styles so the button's own color applies uniformly.
        const neutralHtml = htmlDisplay.replace(/ style="[^"]*"/g, '');

        return (
            <div className="player-row" data-player-name={baseName}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <button
                        className="player-name-btn"
                        onClick={(e) => handlePlayerClick(e, baseName)}
                        style={{
                            fontFamily: 'monospace',
                            whiteSpace: 'pre',
                            fontSize: 'var(--dynamic-log-size, 16px)',
                            color: 'rgba(125, 211, 252, 1)',
                            padding: subtitle ? '4px 0 0 0' : '8px 0'
                        }}
                        dangerouslySetInnerHTML={{ __html: neutralHtml }}
                    />
                    {subtitle && (
                        <div className="where-room" style={{ paddingBottom: '4px', fontSize: 'calc(var(--dynamic-log-size, 16px) * 0.75)' }}>{subtitle}</div>
                    )}
                </div>
                <button 
                    className={`star-btn ${isFavorite ? 'active' : ''}`}
                    onClick={(e) => toggleFavorite(e, baseName)}
                    title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                    <Star size={16} fill={isFavorite ? "currentColor" : "none"} strokeWidth={isFavorite ? 1 : 2} />
                </button>
            </div>
        );
    };

    const swipePos = useRef<{ x: number, y: number } | null>(null);

    return (
        <div 
            className={`character-drawer-overlay ${isOpen ? 'open' : ''}`}
            onClick={handleBackdropClick}
        >
            <div
                className={`character-drawer-content log-card-drawer left-drawer ${isOpen ? 'open' : ''}`}
                onClick={(e) => { if (e.target === e.currentTarget) onClose(); else e.stopPropagation(); }}
                onPointerDown={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest('button') || target.closest('a') || target.closest('.inline-btn') || target.tagName === 'INPUT' || target.closest('.group-member-row')) return;
                    swipePos.current = { x: e.clientX, y: e.clientY };
                    e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerUp={(e) => {
                    if (swipePos.current) {
                        const deltaX = e.clientX - swipePos.current.x;
                        const deltaY = e.clientY - swipePos.current.y;
                        const absX = Math.abs(deltaX);
                        const absY = Math.abs(deltaY);

                        // Swipe down OR swipe left to close (since it's on the left edge)
                        if ((deltaY > 50 && absY > absX) || (deltaX < -40 && absX > absY)) {
                            onClose();
                        }
                    }
                    swipePos.current = null;
                }}
                onPointerCancel={() => {
                    swipePos.current = null;
                }}
                onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const dataStr = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
                    if (!dataStr) return;

                    let data;
                    try { data = JSON.parse(dataStr); } catch (err) { return; }

                    if (data && data.type === 'inline-btn' && data.context) {
                        const target = document.elementFromPoint(e.clientX, e.clientY);
                        const playerEl = target?.closest('[data-player-name]');
                        const playerName = playerEl?.getAttribute('data-player-name');

                        if (playerName) {
                            triggerHaptic(60);
                            executeCommand(`give ${data.context} ${playerName}`);
                        }
                    }
                }}
                style={{ touchAction: 'pan-y' }}
            >                <div className="drawer-header" style={{ pointerEvents: 'auto' }}>
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
                            onClick={(e) => { e.stopPropagation(); setActiveTab('online'); executeCommand('who', true, true, true, true); }}
                        >
                            <span>Online</span>
                        </button>
                        <button
                            className={`drawer-tab ${activeTab === 'nearby' ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); setActiveTab('nearby'); executeCommand('where', true, true, true, true); }}
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
                                groupMembers.map((m, idx) => <MemberRow key={m.id} member={m} index={idx} />)
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px', opacity: 0.3 }}>
                                    <Users size={32} style={{ marginBottom: '10px' }} />
                                    <p style={{ fontSize: '0.8rem' }}>Not in a group.</p>
                                </div>
                            )}
                        </div>
                    ) : activeTab === 'online' ? (
                        <div className="players-section">
                            <div className="online-columns">
                                <div className="online-column">
                                    <div className="column-header">Favorites</div>
                                    {whoList.filter(n => isFav(n)).length > 0 ? (
                                        whoList.filter(n => isFav(n)).map((name, i) => (
                                            <PlayerRow key={`fav-${i}`} name={name} isFavorite={true} />
                                        ))
                                    ) : (
                                        <div className="column-empty">No favorites online</div>
                                    )}
                                </div>
                                <div className="online-column">
                                    <div className="column-header">All</div>
                                    {whoList.length > 0 ? (
                                        whoList.map((name, i) => (
                                            <PlayerRow key={`all-${i}`} name={name} isFavorite={isFav(name)} />
                                        ))
                                    ) : (
                                        <div className="column-empty">No data</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="players-section">
                            {whereList.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {whereList.map((entry, i) => (
                                        <PlayerRow 
                                            key={`nearby-${i}`} 
                                            name={entry.name} 
                                            isFavorite={isFav(entry.name)} 
                                            subtitle={entry.room} 
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px', opacity: 0.3 }}>
                                    <p style={{ fontSize: 'var(--dynamic-log-size, 16px)' }}>No data — tap refresh to load.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
