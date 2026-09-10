/**
 * @file HelpPanel.tsx
 * @description Docked floating window for MUME help topics with 80-column monospace formatting.
 */

import React, { useState, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { useHelpStore } from '../../stores/useHelpStore';
import { parseHelpContent } from '../../utils/helpUtils';
import { DrawerResizeHandle } from '../Drawers/DrawerResizeHandle';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
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

    return (
        <aside
            className="docked-panel help-panel"
            style={style}
            aria-label="Help Panel"
        >
            {!viewport?.isMobile && (
                <DrawerResizeHandle
                    handleType="left"
                    widthVar="--desktop-help-width"
                    minWidth={18}
                    maxWidth={60}
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
                    <button
                        type="button"
                        className="help-panel-nav-btn"
                        onClick={goBack}
                        disabled={historyIndex <= 0}
                        title="Previous topic"
                        aria-label="Previous topic"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        type="button"
                        className="help-panel-nav-btn"
                        onClick={goForward}
                        disabled={historyIndex >= history.length - 1}
                        title="Next topic"
                        aria-label="Next topic"
                    >
                        <ChevronRight size={16} />
                    </button>
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

            {/* Topic Search Bar */}
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

            {/* Content Area */}
            <div className="help-panel-content">
                {parsed.contentHtml ? (
                    <>
                        <pre
                            className="help-panel-pre"
                            onClick={handleContentClick}
                            dangerouslySetInnerHTML={{ __html: parsed.contentHtml }}
                        />
                        {parsed.keywords.length > 0 && (
                            <div className="help-panel-see-also">
                                <div className="help-panel-see-also-title">See also:</div>
                                <div className="help-panel-keywords">
                                    {parsed.keywords.map((kw) => (
                                        <button
                                            key={kw}
                                            type="button"
                                            className="help-panel-keyword-chip"
                                            onClick={() => openTopic(kw)}
                                        >
                                            {kw}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="help-panel-empty">
                        Type a topic above or run <code>help &lt;topic&gt;</code> in game.
                    </div>
                )}
            </div>
        </aside>
    );
};

export default React.memo(HelpPanel);
