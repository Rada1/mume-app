/**
 * @file MumeArchive.tsx
 * @description Shared board and mailbox interface backed by MUME archive commands.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Archive, CornerDownRight, Forward, Inbox, Mail, MessageSquare, Plus, RefreshCw, Search, Send, Trash2, X } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { ArchiveDetail, ArchiveEntry, ArchivePanelMode, ArchiveView, useArchiveStore } from '../../stores/useArchiveStore';
import { getArchiveForwardCommand, getArchiveListCommand, getArchiveReadCommand, getArchiveRemoveCommand, getArchiveReplyCommand, getArchiveSearchCommand } from '../../utils/archiveAdapters';
import './MumeArchive.css';
import './MumeArchiveActions.css';
import './MumeArchiveCompose.css';
import './MumeArchiveMobile.css';

const viewLabels: Record<ArchiveView, string> = {
    board: 'Board',
    'board-threads': 'Threads',
    'mail-inbox': 'Inbox',
    'mail-sent': 'Sent',
    book: 'Book'
};

const modeTitles: Record<ArchivePanelMode, string> = {
    board: 'MUME Boards',
    mail: 'Mailbox',
    book: 'Book Reader'
};

const modeViews: Record<ArchivePanelMode, ArchiveView[]> = {
    board: ['board', 'board-threads'],
    mail: ['mail-inbox', 'mail-sent'],
    book: ['book']
};

const ArchiveTab = ({ view, activeView, onClick }: { view: ArchiveView; activeView: ArchiveView; onClick: () => void }) => {
    const Icon = view === 'board' || view === 'board-threads' ? MessageSquare : view === 'mail-inbox' ? Inbox : Archive;
    return <button className={activeView === view ? 'active' : ''} onClick={onClick}><Icon size={15} /> {viewLabels[view]}</button>;
};

export const MumeArchive: React.FC = () => {
    const {
        isOpen, panelMode, activeView, entriesByView, activeDetail, isLoadingList, isLoadingDetail,
        compose, setIsOpen, setActiveView, setActiveDetail, setCompose, setPendingEditorContext
    } = useArchiveStore();
    const { executeCommand, viewport, mumeEditState, setMumeEditState, handleSaveMumeEdit } = useGame();
    const isMobile = Boolean(viewport?.isMobile);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [size, setSize] = useState({ width: 980, height: 680 });
    const [query, setQuery] = useState('');
    const [isComposerOpen, setIsComposerOpen] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const dragOffset = useRef({ x: 0, y: 0 });
    const resizeStart = useRef({ x: 0, y: 0 });
    const resizeSize = useRef({ width: 980, height: 680 });

    useEffect(() => {
        if (!isOpen) return;
        setPosition({ x: 0, y: 0 });
        setSize({ width: 980, height: 680 });
    }, [isOpen]);

    useEffect(() => {
        setIsComposerOpen(false);
    }, [activeView, isOpen, panelMode]);

    useEffect(() => {
        if (mumeEditState.context?.kind !== 'archive-reply') return;
        setReplyText(mumeEditState.text);
    }, [mumeEditState.context, mumeEditState.text]);

    useEffect(() => {
        if (!isDragging && !isResizing) return;
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setPosition({
                    x: dragOffset.current.x + e.clientX - dragStart.current.x,
                    y: dragOffset.current.y + e.clientY - dragStart.current.y
                });
                return;
            }
            setSize({
                width: Math.max(680, resizeSize.current.width + e.clientX - resizeStart.current.x),
                height: Math.max(460, resizeSize.current.height + e.clientY - resizeStart.current.y)
            });
        };
        const handleMouseUp = () => {
            setIsDragging(false);
            setIsResizing(false);
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing]);

    if (!isOpen) return null;

    const currentEntries = entriesByView[activeView];
    const filteredEntries = currentEntries.filter(entry => {
        const haystack = `${entry.subject} ${entry.author} ${entry.date}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
    });
    const style: React.CSSProperties = isMobile ? {} : {
        width: `${size.width}px`,
        height: `${size.height}px`,
        left: `calc(50% - ${size.width / 2}px + ${position.x}px)`,
        top: `calc(50% - ${size.height / 2}px + ${position.y}px)`
    };

    const refresh = (view = activeView) => {
        const command = getArchiveListCommand(view);
        if (command) executeCommand(command, true, true, false, true);
    };
    const switchView = (view: ArchiveView) => {
        setActiveView(view);
        refresh(view);
    };
    const readEntry = (entry: ArchiveEntry) => {
        setActiveDetail({ ...entry, body: '' });
        executeCommand(getArchiveReadCommand(entry), true, true, false, true);
    };
    const search = () => {
        const command = query.trim() ? getArchiveSearchCommand(activeView, query.trim()) : null;
        executeCommand(command || getArchiveListCommand(activeView), true, true, false, true);
    };
    const sendMail = () => {
        const recipients = compose.recipients.split(/[,\s]+/).map(name => name.trim().replace(/^@/, '')).filter(Boolean).map(name => `@${name}`).join(' ');
        if (!recipients) return;
        executeCommand(`write ${compose.subject.trim()} ${recipients}`.trim());
        setIsComposerOpen(false);
    };
    const postBoard = () => {
        if (!compose.subject.trim()) return;
        executeCommand(`write ${compose.subject.trim()}`);
        setIsComposerOpen(false);
    };
    const replyToEntry = (entry: ArchiveDetail) => {
        const command = getArchiveReplyCommand(entry);
        if (!command) return;
        if (entry.source === 'board' || entry.source === 'mail') {
            setPendingEditorContext({
                kind: 'archive-reply',
                source: entry.source,
                view: entry.view,
                entryId: entry.id,
                subject: entry.subject,
                author: entry.author || 'Unknown'
            });
        }
        executeCommand(command);
    };
    const cancelReply = () => {
        setMumeEditState(prev => ({ ...prev, isOpen: false, context: null }));
    };
    const sendReply = () => {
        handleSaveMumeEdit(replyText);
    };

    const detailParty = activeDetail?.view === 'mail-sent'
        ? activeDetail.recipients || activeDetail.author
        : activeDetail?.author;
    const isBoardView = activeView.startsWith('board');
    const composeLabel = isBoardView ? 'New Board Post' : 'New Mail';
    const shouldShowCompose = panelMode !== 'book' && isComposerOpen;
    const archiveReplyContext = mumeEditState.context?.kind === 'archive-reply' ? mumeEditState.context : null;
    const isReplyComposerOpen = Boolean(
        mumeEditState.isOpen &&
        archiveReplyContext &&
        activeDetail &&
        archiveReplyContext.entryId === activeDetail.id &&
        archiveReplyContext.view === activeDetail.view
    );

    return (
        <div className="mume-mail-overlay" onClick={() => setIsOpen(false)}>
            <div className={`mume-mail-container ${isMobile ? 'is-mobile' : ''}`} style={style} onClick={e => e.stopPropagation()}>
                <div className="mume-mail-header" onMouseDown={e => {
                    if (e.button !== 0) return;
                    setIsDragging(true);
                    dragStart.current = { x: e.clientX, y: e.clientY };
                    dragOffset.current = { ...position };
                    e.preventDefault();
                }}>
                    <div className="mail-title"><Mail size={18} /><h2>{modeTitles[panelMode]}</h2></div>
                    <div className="mail-header-controls" onMouseDown={e => e.stopPropagation()}>
                        <button className="mail-icon-btn" onClick={() => refresh()} title="Refresh"><RefreshCw size={16} className={isLoadingList ? 'spin' : ''} /></button>
                        <button className="mail-icon-btn close" onClick={() => setIsOpen(false)} title="Close"><X size={18} /></button>
                    </div>
                </div>

                <div className={`mume-mail-body mode-${panelMode}`}>
                    <aside className="mail-list-pane">
                        {panelMode !== 'book' && !isMobile && !isComposerOpen && (
                            <button className="archive-compose-sidebar" onClick={() => setIsComposerOpen(true)}>
                                <Plus size={16} /> {composeLabel}
                            </button>
                        )}
                        {panelMode !== 'book' && <div className="mail-tabs">
                            {modeViews[panelMode].map(view => (
                                <ArchiveTab key={view} view={view} activeView={activeView} onClick={() => switchView(view)} />
                            ))}
                        </div>}
                        {panelMode !== 'book' && <div className="mail-search-row">
                            <Search size={14} />
                            <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} placeholder={`Search ${viewLabels[activeView]}`} />
                        </div>}
                        {panelMode !== 'book' && <div className="mail-list">
                            {isLoadingList && currentEntries.length === 0 ? (
                                <div className="mail-status">Loading {viewLabels[activeView].toLowerCase()}...</div>
                            ) : filteredEntries.length === 0 ? (
                                <div className="mail-status">No entries loaded. Refresh near the right board or mailbox.</div>
                            ) : filteredEntries.map(entry => (
                                <button key={`${entry.view}-${entry.id}`} className={`mail-row depth-${entry.depth || 0} ${activeDetail?.id === entry.id && activeDetail.view === entry.view ? 'active' : ''}`} onClick={() => readEntry(entry)}>
                                    <span className={`read-dot ${entry.isRead ? 'read' : ''}`} />
                                    <span className="mail-row-main">
                                        <span className="mail-row-subject">{entry.subject}</span>
                                        <span className="mail-row-meta">#{entry.id} {entry.author || 'Unknown'} {entry.replyCount ? `${entry.replyCount} replies` : entry.date}</span>
                                    </span>
                                </button>
                            ))}
                        </div>}
                    </aside>

                    <main className={`mail-view-pane ${shouldShowCompose ? 'composer-open' : ''}`}>
                        <section className="mail-message-view">
                            {isLoadingDetail ? <div className="mail-status">Opening entry...</div> : activeDetail ? (
                                <>
                                    <div className="mail-message-header">
                                        <h3>{activeDetail.subject}</h3>
                                        <div>{activeDetail.view === 'mail-sent' ? 'To' : 'From'}: {detailParty || 'Unknown'}</div>
                                        {activeDetail.date && <div>Date: {activeDetail.date}</div>}
                                    </div>
                                    <pre className="mail-message-body">{activeDetail.body || '(No body captured yet.)'}</pre>
                                    <div className="mail-actions">
                                        {getArchiveReplyCommand(activeDetail) && <button onClick={() => replyToEntry(activeDetail)}><CornerDownRight size={15} /> Reply</button>}
                                        {getArchiveForwardCommand(activeDetail) && <button onClick={() => executeCommand(getArchiveForwardCommand(activeDetail)!)}><Forward size={15} /> Forward</button>}
                                        {getArchiveRemoveCommand(activeDetail) && <button onClick={() => executeCommand(getArchiveRemoveCommand(activeDetail)!)}><Trash2 size={15} /> Remove</button>}
                                    </div>
                                    {isReplyComposerOpen && archiveReplyContext && (
                                        <section className="archive-inline-reply">
                                            <div className="archive-inline-reply-title">
                                                <span>Reply to {archiveReplyContext.subject}</span>
                                                <button className="mail-compose-close" onClick={cancelReply} title="Close reply"><X size={16} /></button>
                                            </div>
                                            <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Write your reply..." autoFocus />
                                            <div className="archive-inline-reply-actions">
                                                <button className="archive-inline-cancel" onClick={cancelReply}>Cancel</button>
                                                <button className="archive-inline-send" onClick={sendReply}><Send size={15} /> Send Reply</button>
                                            </div>
                                        </section>
                                    )}
                                </>
                            ) : <div className="mail-status mail-empty"><Mail size={44} /> {panelMode === 'book' ? 'Read a book to open it here.' : 'Select an entry to read it.'}</div>}
                        </section>

                        {shouldShowCompose && <section className={`mail-compose ${isBoardView ? 'board-compose' : ''}`}>
                            <div className="mail-compose-title">
                                <span><Plus size={15} /> {composeLabel}</span>
                                <button className="mail-compose-close" onClick={() => setIsComposerOpen(false)} title="Close compose"><X size={16} /></button>
                            </div>
                            {!isBoardView && <input value={compose.recipients} onChange={e => setCompose({ recipients: e.target.value })} placeholder="@recipient @recipient" />}
                            <input value={compose.subject} onChange={e => setCompose({ subject: e.target.value })} placeholder={isBoardView ? 'Post title' : 'Subject'} />
                            <textarea value={compose.body} onChange={e => setCompose({ body: e.target.value })} placeholder="Draft notes; MUME editor opens after send/write." />
                            <button className="mail-send-btn" onClick={isBoardView ? postBoard : sendMail}><Send size={15} /> {isBoardView ? 'Post' : 'Send'}</button>
                        </section>}
                    </main>
                </div>
                {panelMode !== 'book' && isMobile && !isComposerOpen && (
                    <button className="archive-compose-fab" onClick={() => setIsComposerOpen(true)} title={composeLabel}>
                        <Plus size={18} /> {isBoardView ? 'Post' : 'Compose'}
                    </button>
                )}
                <div className="mume-mail-resize-handle" onMouseDown={e => {
                    if (e.button !== 0) return;
                    setIsResizing(true);
                    resizeStart.current = { x: e.clientX, y: e.clientY };
                    resizeSize.current = { ...size };
                    e.preventDefault();
                }} />
            </div>
        </div>
    );
};
