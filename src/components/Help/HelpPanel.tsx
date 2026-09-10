/**
 * @file HelpPanel.tsx
 * @description Docked floating window for MUME help topics with 80-column monospace formatting.
 */

import React, { useState, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { useHelpStore } from '../../stores/useHelpStore';
import { parseHelpContent } from '../../utils/helpUtils';
import { DrawerResizeHandle } from '../Drawers/DrawerResizeHandle';
import { BookOpen, ChevronLeft, ChevronRight, Columns2, Search, X } from 'lucide-react';
import HelpWikiPane from './HelpWikiPane';
import './HelpPanel.css';

interface HelpPanelProps {
    style?: React.CSSProperties;
}

// --- Component Section ---

export const HelpPanel: React.FC<HelpPanelProps> = ({ style }) => {
    const { isOpen, helpData, currentTopic, history, historyIndex, setIsOpen, goBack, goForward } = useHelpStore();
    const { executeCommand, triggerHaptic, viewport } = useGame() as {
        executeCommand?: (cmd: string, silent?: boolean, isSystem?: boolean, skipQueue?: boolean, isUiSync?: boolean) => void;
        triggerHaptic?: (ms: number) => void;
        viewport?: { isMobile: boolean };
    };
    const [searchInput, setSearchInput] = useState('');
    const [activeView, setActiveView] = useState<'game' | 'wiki' | 'split'>('game');
    const [splitPercent, setSplitPercent] = useState(46);

    const parsed = useMemo(() => parseHelpContent(helpData), [helpData]);

    if (!isOpen) return null;

    const openTopic = (topic: string) => {
        triggerHaptic?.(10);
        const cleanTopic = topic.trim();
        if (!cleanTopic) return;
        executeCommand?.(cleanTopic.toLowerCase() === 'help' ? 'help' : `help ${cleanTopic}`, false, false, false, true);
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchInput.trim()) return;
        openTopic(searchInput);
        setSearchInput('');
    };

    const handleContentClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const btn = target.closest('.help-topic-btn') as HTMLElement | null;
        if (btn) {
            const cmd = btn.getAttribute('data-cmd');
            if (cmd) openTopic(cmd);
        }
    };

    const handleSplitResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
        const container = event.currentTarget.parentElement;
        if (!container) return;

        const updateSplit = (clientX: number) => {
            const rect = container.getBoundingClientRect();
            const nextPercent = ((clientX - rect.left) / rect.width) * 100;
            setSplitPercent(Math.max(28, Math.min(72, nextPercent)));
        };
        const onMove = (moveEvent: PointerEvent) => updateSplit(moveEvent.clientX);
        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            document.body.classList.remove('global-dragging');
        };

        event.preventDefault();
        document.body.classList.add('global-dragging');
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    const gameHelp = (
        <section className="help-panel-game-pane" aria-label="In-game help">
            <form className="help-panel-search-bar" onSubmit={handleSearchSubmit}>
                <Search size={14} color="var(--text-dim)" />
                <input
                    type="text"
                    className="help-panel-search-input"
                    placeholder="Search help topic..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                />
            </form>
            <div className="help-panel-content">
                {parsed.contentHtml ? (
                    <>
                        <pre className="help-panel-pre" onClick={handleContentClick} dangerouslySetInnerHTML={{ __html: parsed.contentHtml }} />
                        {parsed.keywords.length > 0 && (
                            <div className="help-panel-see-also">
                                <div className="help-panel-see-also-title">See also:</div>
                                <div className="help-panel-keywords">
                                    {parsed.keywords.map((kw) => (
                                        <button key={kw} type="button" className="help-panel-keyword-chip" onClick={() => openTopic(kw)}>{kw}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : <div className="help-panel-empty">Type a topic above or run <code>help &lt;topic&gt;</code> in game.</div>}
            </div>
        </section>
    );

    return (
        <aside
            className={`docked-panel help-panel help-panel-${activeView}`}
            style={style}
            aria-label="Help Panel"
        >
            {!viewport?.isMobile && (
                <DrawerResizeHandle
                    handleType="left"
                    widthVar={activeView === 'split' ? '--desktop-help-split-width' : '--desktop-help-width'}
                    minWidth={activeView === 'split' ? 45 : 18}
                    maxWidth={activeView === 'split' ? 88 : 60}
                />
            )}

            {/* Header */}
            <div className="help-panel-header">
                <div className="help-panel-title-group">
                    <span>Help</span>
                    {currentTopic && (
                        <span className="help-panel-topic-badge">: {currentTopic}</span>
                    )}
                </div>

                <div className="help-panel-header-actions">
                    {activeView !== 'wiki' && <button
                        type="button"
                        className="help-panel-nav-btn"
                        onClick={goBack}
                        disabled={historyIndex <= 0}
                        title="Previous topic"
                        aria-label="Previous topic"
                    >
                        <ChevronLeft size={16} />
                    </button>}
                    {activeView !== 'wiki' && <button
                        type="button"
                        className="help-panel-nav-btn"
                        onClick={goForward}
                        disabled={historyIndex >= history.length - 1}
                        title="Next topic"
                        aria-label="Next topic"
                    >
                        <ChevronRight size={16} />
                    </button>}
                    <button
                        type="button"
                        className="help-panel-nav-btn"
                        onClick={() => setIsOpen(false)}
                        title="Close help"
                        aria-label="Close help"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            <div className="help-panel-tabs" role="tablist" aria-label="Help sources">
                <button type="button" role="tab" aria-selected={activeView === 'game'} className={activeView === 'game' ? 'is-active' : ''} onClick={() => setActiveView('game')}>
                    <BookOpen size={13} /> Game Help
                </button>
                <button type="button" role="tab" aria-selected={activeView === 'wiki'} className={activeView === 'wiki' ? 'is-active' : ''} onClick={() => setActiveView('wiki')}>
                    <BookOpen size={13} /> MUME Wiki
                </button>
                <button type="button" role="tab" aria-selected={activeView === 'split'} className={`help-panel-split-tab${activeView === 'split' ? ' is-active' : ''}`} onClick={() => setActiveView('split')}>
                    <Columns2 size={13} /> Split
                </button>
            </div>

            <div
                className={`help-panel-view help-panel-view-${activeView}`}
                style={activeView === 'split' ? { '--help-split-size': `${splitPercent}%` } as React.CSSProperties : undefined}
            >
                {activeView === 'game' && gameHelp}
                {activeView === 'wiki' && <HelpWikiPane />}
                {activeView === 'split' && <>
                    <div className="help-panel-split-game">{gameHelp}</div>
                    <div className="help-panel-split-divider" onPointerDown={handleSplitResizeStart} role="separator" aria-orientation="vertical" aria-label="Resize help panes" />
                    <HelpWikiPane />
                </>}
            </div>
        </aside>
    );
};

export default React.memo(HelpPanel);
