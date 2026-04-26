/**
 * @file PlayersView.tsx
 * @description Renders the group members, online players, and nearby players.
 */

import React, { useState, useRef, useLayoutEffect } from 'react';
import { RefreshCw, Users, Star } from 'lucide-react';
import { useGame, useUI } from '../../../context/GameContext';
import { usePlayerLines } from '../../../hooks/drawers/usePlayerLines';
import { MemberRow } from '../MemberRow';
import { LineItem } from '../LineItem';

interface PlayersViewProps {
    isOpen: boolean;
    onClose: () => void;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
}

export const PlayersView: React.FC<PlayersViewProps> = ({ isOpen, onClose, executeCommand: propsExecuteCommand }) => {
    const [activeTab, setActiveTab] = useState<'group' | 'online' | 'nearby'>('online');
    const {
        groupMembers, triggerHaptic, favorites,
        executeCommand: contextExecuteCommand
    } = useGame();
    const { whoLines: rawWho, whereLines: rawWhere } = useUI();
    const executeCommand = contextExecuteCommand || propsExecuteCommand;

    const infoContainerRef = useRef<HTMLDivElement>(null);
    const [infoFontSize, setInfoFontSize] = useState<string>('inherit');

    useLayoutEffect(() => {
        if (!infoContainerRef.current) return;
        const measure = () => {
            const width = infoContainerRef.current?.clientWidth;
            if (width) setInfoFontSize(`${(width - 24) / 48}px`);
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(infoContainerRef.current);
        return () => ro.disconnect();
    }, [activeTab, isOpen]);

    const { whoLines, whereLines } = usePlayerLines({
        whoLines: rawWho,
        whereLines: rawWhere,
        favorites: favorites || []
    });

    const handleRefresh = (e: React.MouseEvent) => {
        e.stopPropagation();
        triggerHaptic(20);
        executeCommand('who', true, true, true, true);
        setTimeout(() => executeCommand('where', true, true, true, true), 150);
    };

    return (
        <div className="players-view-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
            <div ref={infoContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', fontFamily: 'var(--font-main, monospace)', fontSize: infoFontSize }}>
                {activeTab === 'group' ? (
                    <div className="group-tab">
                        {(Array.isArray(groupMembers) && groupMembers.length > 0) ? (
                            groupMembers.map((m, idx) => <MemberRow key={m.id} member={m} index={idx} />)
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px', opacity: 0.3 }}>
                                <Users size={32} style={{ marginBottom: '10px' }} />
                                <p style={{ fontSize: '0.8rem' }}>Not in a group.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="players-list-tab">
                        {(activeTab === 'online' ? whoLines : whereLines).map(line => (
                            <LineItem key={line.id} line={line} fontSize="inherit" />
                        ))}
                    </div>
                )}
                <div style={{ height: '60px' }} />
            </div>

            {/* Bottom Section: Tabs and Refresh */}
            <div style={{ position: 'absolute', bottom: '12px', left: '0', right: '0', display: 'flex', justifyContent: 'center', gap: '10px', pointerEvents: 'none' }}>
                <div style={{ display: 'flex', gap: '6px', pointerEvents: 'auto' }}>
                    {['group', 'online', 'nearby'].map((tab) => (
                        <div
                            key={tab}
                            className={`drawer-tab ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => { triggerHaptic(15); setActiveTab(tab as any); }}
                            style={{
                                padding: '6px 14px', borderRadius: '16px', fontSize: '9px', fontWeight: '900',
                                textTransform: 'uppercase', cursor: 'pointer',
                                background: activeTab === tab ? 'var(--accent)' : 'rgba(28, 28, 30, 0.4)',
                                color: activeTab === tab ? '#000' : 'rgba(255,255,255,0.4)',
                                border: activeTab === tab ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.1)'
                            }}
                        >
                            {tab}
                        </div>
                    ))}
                </div>
                <button
                    className="refresh-button floating-refresh"
                    onClick={handleRefresh}
                    style={{
                        position: 'absolute', bottom: '8px', right: '8px', zIndex: 110,
                        background: 'rgba(40, 40, 45, 0.4)', backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)',
                        width: '32px', height: '32px', borderRadius: '16px', pointerEvents: 'auto'
                    }}
                >
                    <RefreshCw size={16} />
                </button>
            </div>
        </div>
    );
};
