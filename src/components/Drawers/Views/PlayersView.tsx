import React, { useState, useRef, useLayoutEffect } from 'react';
import { X, Users, RefreshCw, Star } from 'lucide-react';
import { useGame, useUI } from '../../../context/GameContext';
import { MemberRow } from '../MemberRow';
import { escapeHtml, sanitizeMumeHtml } from '../../../utils/securityUtils';
import '../CharacterDrawer.css';
import '../PlayersDrawer.css';

interface PlayersViewProps {
    isOpen: boolean;
    onClose: () => void;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
}

export const PlayersView: React.FC<PlayersViewProps> = ({ isOpen, onClose, executeCommand: propsExecuteCommand }) => {
    const [activeTab, setActiveTab] = useState<'group' | 'online' | 'nearby'>('online');
    const {
        whoList, whereList, groupMembers, triggerHaptic, favorites, setFavorites,
        executeCommand: contextExecuteCommand, selectedObjectIds,
        handleLogPointerDown, handleLogPointerUp, handleLogClick,
        clearObjectSelection
    } = useGame();
    const { setPopoverState, whoLines, whereLines } = useUI();

    const executeCommand = contextExecuteCommand || propsExecuteCommand;


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
            setId: 'player',
            kind: 'player',
            location: 'room',
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
        const isHtml = name.includes('|');
        const [htmlDisplay, baseName] = isHtml ? name.split('|') : [name, name];

        // If it's HTML (from whoList), sanitize it; if raw text (from whereList), escape it.
        const neutralHtml = isHtml
            ? sanitizeMumeHtml(htmlDisplay.replace(/ style="[^"]*"/g, ''))
            : escapeHtml(htmlDisplay);

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

    const infoContainerRef = useRef<HTMLDivElement>(null);
    const [infoFontSize, setInfoFontSize] = useState<string>('inherit');

    useLayoutEffect(() => {
        if (!infoContainerRef.current || (activeTab !== 'online' && activeTab !== 'nearby')) return;
        const measure = () => {
            const el = infoContainerRef.current;
            if (!el) return;
            const cs = getComputedStyle(el);
            const innerWidth = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
            if (innerWidth > 0) setInfoFontSize(`${innerWidth / 48}px`);
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(infoContainerRef.current);
        return () => ro.disconnect();
    }, [activeTab, isOpen]);

    const onClickInternal = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const btn = target.closest('.inline-btn') as HTMLElement;
        if (btn) {
            handleLogClick(e);
        } else if (!target.closest('.drawer-tab')) {
            if (selectedObjectIds.size > 0) {
                clearObjectSelection();
                triggerHaptic(20);
            }
        }
    };

    React.useEffect(() => {
        if (isOpen) {
            if (activeTab === 'online') {
                executeCommand('who', true, true, true, true);
            } else if (activeTab === 'nearby') {
                executeCommand('where', true, true, true, true);
            }
        }
    }, [isOpen, activeTab, executeCommand]);

    const DrawerLineItem = React.memo(({
        line,
        fontSize
    }: {
        line: import('../../../types').DrawerLine,
        fontSize: string
    }) => {
        const isHeader = !!line.isHeader;
        const rowBg = isHeader ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.6)';
        const depth = line.depth || 0;
        const dim = 'var(--text-primary)';
        const playerColor = 'rgba(125, 211, 252, 1)';

        const renderTokens = (tokens: import('../../../types').Token[]) => {
            return tokens.map((token, idx) => {
                if (token.type === 'entity') {
                    return (
                        <span
                            key={idx}
                            className="inline-btn auto-item"
                            data-id={`player:${token.content}`}
                            data-context={token.content}
                            data-action="menu"
                            data-kind="player"
                            data-location="room"
                            style={{
                                display: 'inline',
                                lineHeight: 'inherit',
                                padding: '0 4px',
                                margin: '0',
                                background: 'transparent',
                                border: 'none',
                                borderRadius: '0',
                                boxShadow: 'none',
                                cursor: 'default',
                                color: playerColor,
                                whiteSpace: 'pre',
                            }}
                        >{token.content}</span>
                    );
                }
                return (
                    <span key={idx} style={{ color: token.type === 'text' ? dim : undefined }}>
                        {token.content}
                    </span>
                );
            });
        };

        if (line.tokens && line.tokens.length > 0) {
            return (
                <div style={{
                    background: rowBg,
                    borderRadius: '4px',
                    margin: '0.5px 0',
                    padding: '1px 8px',
                    paddingLeft: `${depth * 8 + 8}px`,
                    width: '100%',
                    boxSizing: 'border-box',
                    display: 'block',
                    minHeight: '16px',
                    lineHeight: '1.5',
                    whiteSpace: 'pre',
                    fontSize
                }}>
                    {renderTokens(line.tokens)}
                </div>
            );
        }

        return (
            <div style={{
                background: rowBg,
                borderRadius: '4px',
                margin: '0.5px 0',
                padding: '1px 8px',
                paddingLeft: `${depth * 8 + 8}px`,
                width: '100%',
                boxSizing: 'border-box',
                display: 'block',
                color: '#ffffff',
                minHeight: '16px',
                lineHeight: '1.5',
                whiteSpace: 'pre',
                overflow: isHeader ? 'visible' : 'hidden',
                textOverflow: 'ellipsis',
                fontSize
            }} dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(line.html) }} />
        );
    });

    return (
        <div 
            className="players-view-content" 
            onClick={onClickInternal}
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
            style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                height: '100%',
                width: '100%',
                position: 'relative'
            }}
        >
            <div className="drawer-header" style={{ pointerEvents: 'auto', display: 'flex', justifyContent: 'flex-end', padding: '6px 10px', background: 'transparent', gap: '8px' }}>
                {window.innerWidth > 1024 && (
                    <button
                        style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', width: '28px', height: '28px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            <div className="drawer-body" style={{ pointerEvents: 'auto', flex: 1, marginRight: '0', overflowY: 'auto', position: 'relative', padding: 0 }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
                {activeTab === 'group' ? (
                    <div style={{ padding: '8px 0 0 0' }}>
                        {(Array.isArray(groupMembers) && groupMembers.length > 0) ? (
                            groupMembers.map((m, idx) => <MemberRow key={m.id} member={m} index={idx} />)
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px', opacity: 0.3 }}>
                                <Users size={32} style={{ marginBottom: '10px' }} />
                                <p style={{ fontSize: '0.8rem' }}>Not in a group.</p>
                            </div>
                        )}
                        <div style={{ height: '50px', flexShrink: 0 }} />
                    </div>
                ) : activeTab === 'online' ? (
                    <div className="online-tab" style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div ref={infoContainerRef} style={{
                            fontFamily: 'var(--font-main, monospace)',
                            fontSize: infoFontSize,
                            visibility: infoFontSize === 'inherit' ? 'hidden' : 'visible',
                            lineHeight: '1.5',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '0',
                            padding: '8px 12px',
                            boxShadow: 'none',
                            margin: '0',
                            position: 'relative',
                            minHeight: '120px'
                        }}>

                            {whoLines?.length > 0 ? (
                                whoLines.map(line => (
                                    <DrawerLineItem
                                        key={line.id}
                                        line={line}
                                        fontSize={infoFontSize}
                                    />
                                ))
                            ) : (
                                <div className="empty-state" style={{ textAlign: 'center', padding: '40px', opacity: 0.3 }}>
                                    <p style={{ fontSize: 'var(--dynamic-log-size, 16px)', fontStyle: 'italic' }}>No player data captured.</p>
                                </div>
                            )}
                            <div style={{ height: '50px', flexShrink: 0 }} />
                        </div>
                    </div>
                ) : (
                    <div className="nearby-tab" style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div ref={infoContainerRef} style={{
                            fontFamily: 'var(--font-main, monospace)',
                            fontSize: infoFontSize,
                            visibility: infoFontSize === 'inherit' ? 'hidden' : 'visible',
                            lineHeight: '1.5',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '0',
                            padding: '8px 12px',
                            boxShadow: 'none',
                            margin: '0',
                            position: 'relative',
                            minHeight: '120px'
                        }}>

                            {whereLines?.length > 0 ? (
                                whereLines.map(line => (
                                    <DrawerLineItem
                                        key={line.id}
                                        line={line}
                                        fontSize={infoFontSize}
                                    />
                                ))
                            ) : (
                                <div className="empty-state" style={{ textAlign: 'center', padding: '40px', opacity: 0.3 }}>
                                    <p style={{ fontSize: 'var(--dynamic-log-size, 16px)', fontStyle: 'italic' }}>No player data captured.</p>
                                </div>
                            )}
                            <div style={{ height: '50px', flexShrink: 0 }} />
                        </div>
                    </div>
                )}
            </div>

            {/* Individual Floating Frosted Tabs */}
            <div className="utility-nav-tabs" style={{
                position: 'absolute',
                bottom: '12px',
                left: '0',
                right: '0',
                display: 'flex',
                flexDirection: 'row',
                gap: '10px',
                zIndex: 100,
                pointerEvents: 'none',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                boxShadow: 'none',
                padding: '0 10px'
            }}>
                <div
                    className={`drawer-tab ${activeTab === 'group' ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setActiveTab('group'); triggerHaptic(15); }}
                    style={{
                        padding: '6px 14px',
                        minWidth: '55px',
                        height: '24px',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                        background: activeTab === 'group' ? 'var(--accent)' : 'rgba(28, 28, 30, 0.4)',
                        backdropFilter: activeTab === 'group' ? 'none' : 'blur(10px) saturate(160%)',
                        WebkitBackdropFilter: activeTab === 'group' ? 'none' : 'blur(10px) saturate(160%)',
                        color: activeTab === 'group' ? '#000' : 'rgba(255,255,255,0.4)',
                        border: activeTab === 'group' ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.1)',
                        boxShadow: activeTab === 'group' ? '0 0 15px var(--accent-glow)' : '0 4px 12px rgba(0,0,0,0.3)',
                        transition: 'all 0.2s ease',
                        fontSize: '9px',
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px'
                    }}
                >
                    Group
                </div>
                <div
                    className={`drawer-tab ${activeTab === 'online' ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setActiveTab('online'); executeCommand('who', true, true, true, true); triggerHaptic(15); }}
                    style={{
                        padding: '6px 14px',
                        minWidth: '55px',
                        height: '24px',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                        background: activeTab === 'online' ? 'var(--accent)' : 'rgba(28, 28, 30, 0.4)',
                        backdropFilter: activeTab === 'online' ? 'none' : 'blur(10px) saturate(160%)',
                        WebkitBackdropFilter: activeTab === 'online' ? 'none' : 'blur(10px) saturate(160%)',
                        color: activeTab === 'online' ? '#000' : 'rgba(255,255,255,0.4)',
                        border: activeTab === 'online' ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.1)',
                        boxShadow: activeTab === 'online' ? '0 0 15px var(--accent-glow)' : '0 4px 12px rgba(0,0,0,0.3)',
                        transition: 'all 0.2s ease',
                        fontSize: '9px',
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px'
                    }}
                >
                    Online
                </div>
                <div
                    className={`drawer-tab ${activeTab === 'nearby' ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setActiveTab('nearby'); executeCommand('where', true, true, true, true); triggerHaptic(15); }}
                    style={{
                        padding: '6px 14px',
                        minWidth: '55px',
                        height: '24px',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                        background: activeTab === 'nearby' ? 'var(--accent)' : 'rgba(28, 28, 30, 0.4)',
                        backdropFilter: activeTab === 'nearby' ? 'none' : 'blur(10px) saturate(160%)',
                        WebkitBackdropFilter: activeTab === 'nearby' ? 'none' : 'blur(10px) saturate(160%)',
                        color: activeTab === 'nearby' ? '#000' : 'rgba(255,255,255,0.4)',
                        border: activeTab === 'nearby' ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.1)',
                        boxShadow: activeTab === 'nearby' ? '0 0 15px var(--accent-glow)' : '0 4px 12px rgba(0,0,0,0.3)',
                        transition: 'all 0.2s ease',
                        fontSize: '9px',
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px'
                    }}
                >
                    Nearby
                </div>
            </div>

            {activeTab !== 'group' && (
                <button
                    className="refresh-button floating-refresh"
                    title="Refresh"
                    onClick={(e) => {
                        triggerHaptic(15);
                        handleRefresh(e);
                    }}
                    style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '8px',
                        zIndex: 110,
                        background: 'rgba(40, 40, 45, 0.4)',
                        backdropFilter: 'blur(10px) saturate(160%)',
                        WebkitBackdropFilter: 'blur(10px) saturate(160%)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.8)',
                        width: '32px',
                        height: '32px',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                        pointerEvents: 'auto'
                    }}
                >
                    <RefreshCw size={16} />
                </button>
            )}
        </div>
    );
};
