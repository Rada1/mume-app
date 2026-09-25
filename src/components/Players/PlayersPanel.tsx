/**
 * @file PlayersPanel.tsx
 * @description Floating/docked panel showing Group, Nearby, and Online player rosters
 * in a vertically stacked, independently expandable accordion.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useGame, useUI, useVitals } from '../../context/GameContext';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { UnifiedView } from '../Drawers/Views/UnifiedView';
import { NearbyWhereView } from '../Drawers/NearbyWhereView';
import { GroupTableView } from '../Drawers/GroupTableView';
import { DrawerResizeHandle } from '../Drawers/DrawerResizeHandle';
import { parsePlayerCountFromLines } from '../../utils/playerCountUtils';
import { ChevronDown, ChevronRight, RefreshCw, X } from 'lucide-react';

interface PlayersPanelProps {
    style?: React.CSSProperties;
}

interface ExpandedSections {
    group: boolean;
    nearby: boolean;
    online: boolean;
}

const STORAGE_KEY = 'mume-players-expanded-sections';

const getInitialExpanded = (): ExpandedSections => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            return {
                group: parsed.group !== false,
                nearby: parsed.nearby !== false,
                online: parsed.online !== false,
            };
        }
    } catch {
        // Fallback to default
    }
    return { group: true, nearby: true, online: true };
};

// --- Logic Section ---

const PlayersPanel: React.FC<PlayersPanelProps> = ({ style }) => {
    const { triggerHaptic, executeCommand, viewport } = useGame() as any;
    const { whoLines, whereLines, setWhoLines, setWhereLines } = useUI();
    const { groupMembers } = useVitals();
    const showChatWindow = useSettingsStore(s => s.showChatWindow);
    const setShowPlayersPanel = useSettingsStore(s => s.setShowPlayersPanel);

    const [expanded, setExpanded] = useState<ExpandedSections>(getInitialExpanded);
    const lastNearbyRefreshRef = useRef(0);

    const toggleSection = (section: keyof ExpandedSections) => {
        triggerHaptic?.(10);
        setExpanded(prev => {
            const next = { ...prev, [section]: !prev[section] };
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            } catch {
                // Ignore storage errors
            }
            return next;
        });
    };

    const refreshGroup = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        triggerHaptic?.(15);
        executeCommand('group', true, true, false, true);
    };

    const refreshNearby = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        triggerHaptic?.(15);
        const now = Date.now();
        if (now - lastNearbyRefreshRef.current < 1000) return;
        lastNearbyRefreshRef.current = now;
        setWhereLines?.([]);
        executeCommand('where', true, true, false, true);
    };

    const refreshOnline = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        triggerHaptic?.(15);
        setWhoLines?.([]);
        executeCommand('who', true, true, false, true);
    };

    // Auto-fetch data on mount if sections are expanded and empty
    useEffect(() => {
        if (expanded.online && (!whoLines || whoLines.length === 0)) {
            executeCommand('who', true, true, false, true);
        }
        if (expanded.nearby && (!whereLines || whereLines.length === 0)) {
            executeCommand('where', true, true, false, true);
        }
        if (expanded.group && (!groupMembers || groupMembers.length === 0)) {
            executeCommand('group', true, true, false, true);
        }
    }, []);

    const groupCount = groupMembers ? groupMembers.length : 0;
    const nearbyCount = (whereLines || []).filter(l => !l.isHeader && l.text && l.text.trim().length > 0).length;
    const onlineCount = parsePlayerCountFromLines(whoLines || []);

    return (
        <aside className={`docked-panel players-panel${showChatWindow ? ' with-chat' : ''}`} style={style} aria-label="Players panel">
            {!viewport?.isMobile && <DrawerResizeHandle handleType="left" widthVar="--desktop-players-width" minWidth={15} maxWidth={60} />}
            <div className="players-panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>players</span>
                <button
                    type="button"
                    onClick={() => setShowPlayersPanel(false)}
                    title="Close players panel"
                    aria-label="Close players panel"
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '2px' }}
                >
                    <X size={14} />
                </button>
            </div>

            <div className="players-accordion-container">
                {/* 1. Group Section */}
                <section className={`players-accordion-section ${expanded.group ? 'is-expanded' : 'is-collapsed'}`}>
                    <div
                        className="players-section-header"
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleSection('group')}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSection('group'); } }}
                        aria-expanded={expanded.group}
                    >
                        <div className="players-section-header-left">
                            <span className="players-section-chevron">
                                {expanded.group ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </span>
                            <span className="players-section-title">group</span>
                            <span className="players-section-count">({groupCount})</span>
                        </div>
                        <button
                            type="button"
                            className="players-section-refresh-btn"
                            onClick={refreshGroup}
                            title="Refresh group"
                            aria-label="Refresh group"
                        >
                            <RefreshCw size={13} />
                        </button>
                    </div>
                    {expanded.group && (
                        <div className="players-section-body">
                            <GroupTableView members={groupMembers} />
                        </div>
                    )}
                </section>

                {/* 2. Nearby Section */}
                <section className={`players-accordion-section ${expanded.nearby ? 'is-expanded' : 'is-collapsed'}`}>
                    <div
                        className="players-section-header"
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleSection('nearby')}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSection('nearby'); } }}
                        aria-expanded={expanded.nearby}
                    >
                        <div className="players-section-header-left">
                            <span className="players-section-chevron">
                                {expanded.nearby ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </span>
                            <span className="players-section-title">nearby</span>
                            <span className="players-section-count">({nearbyCount})</span>
                        </div>
                        <button
                            type="button"
                            className="players-section-refresh-btn"
                            onClick={refreshNearby}
                            title="Refresh nearby"
                            aria-label="Refresh nearby"
                        >
                            <RefreshCw size={13} />
                        </button>
                    </div>
                    {expanded.nearby && (
                        <div className="players-section-body">
                            <NearbyWhereView
                                lines={whereLines}
                                onRefresh={refreshNearby}
                                hideFloatingRefresh
                            />
                        </div>
                    )}
                </section>

                {/* 3. Online Section */}
                <section className={`players-accordion-section ${expanded.online ? 'is-expanded' : 'is-collapsed'}`}>
                    <div
                        className="players-section-header"
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleSection('online')}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSection('online'); } }}
                        aria-expanded={expanded.online}
                    >
                        <div className="players-section-header-left">
                            <span className="players-section-chevron">
                                {expanded.online ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </span>
                            <span className="players-section-title">online</span>
                            <span className="players-section-count">({onlineCount})</span>
                        </div>
                        <button
                            type="button"
                            className="players-section-refresh-btn"
                            onClick={refreshOnline}
                            title="Refresh online"
                            aria-label="Refresh online"
                        >
                            <RefreshCw size={13} />
                        </button>
                    </div>
                    {expanded.online && (
                        <div className="players-section-body">
                            <UnifiedView
                                lines={whoLines}
                                category="inline-player"
                                emptyMessage="No player data. Tap refresh to update."
                                hideFloatingRefresh
                            />
                        </div>
                    )}
                </section>
            </div>
        </aside>
    );
};

export default React.memo(PlayersPanel);
