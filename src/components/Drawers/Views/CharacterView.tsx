/**
 * @file CharacterView.tsx
 * @description Renders the player's info, practice skills, and quests.
 */

import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useGame, useVitals, useUI } from '../../../context/GameContext';
import { useCharacterLines } from '../../../hooks/drawers/useCharacterLines';
import { LineItem } from '../LineItem';

interface CharacterViewProps {
    isOpen: boolean;
    onClose: () => void;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
}

export const CharacterView: React.FC<CharacterViewProps> = ({
    isOpen,
    onClose,
    executeCommand: propsExecuteCommand
}) => {
    const {
        practice,
        executeCommand: contextExecuteCommand,
        triggerHaptic
    } = useGame();
    const { characterInfo } = useVitals();
    const { 
        ui, setUI, 
        infoLines: rawInfo, practiceLines: rawPractice, questLines: rawQuest 
    } = useUI();
    
    const activeTab = ui.characterTab || 'info';
    const setActiveTab = (tab: 'info' | 'practice' | 'quests') => setUI((prev: any) => ({ ...prev, characterTab: tab }));
    const executeCommand = contextExecuteCommand || propsExecuteCommand;

    const infoContainerRef = useRef<HTMLDivElement>(null);
    const [tabFontSize, setTabFontSize] = useState<string>('inherit');

    useLayoutEffect(() => {
        if (!infoContainerRef.current) return;
        const measure = () => {
            const width = infoContainerRef.current?.clientWidth;
            if (width) setTabFontSize(`${(width - 24) / 48}px`);
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(infoContainerRef.current);
        return () => ro.disconnect();
    }, [activeTab, isOpen]);

    const { infoLines, practiceLines, questLines } = useCharacterLines({
        infoLines: rawInfo,
        practiceLines: rawPractice,
        questLines: rawQuest,
        isAtGuildmaster: practice?.practiceData?.isAtGuildmaster
    });

    const handleRefresh = (e: React.MouseEvent) => {
        e.stopPropagation();
        triggerHaptic(15);
        if (activeTab === 'info') {
            executeCommand('info', true, true, true, true);
        } else if (activeTab === 'practice') {
            practice.setIsUiRequested(true);
            executeCommand('practice', true, true, true, true);
        } else {
            executeCommand('quest', true, true, true, true);
        }
    };

    const renderLines = (lines: any[]) => {
        if (!lines || lines.length === 0) {
            return (
                <div className="empty-state" style={{ textAlign: 'center', padding: '40px', opacity: 0.3 }}>
                    <p style={{ fontStyle: 'italic' }}>No data captured.</p>
                </div>
            );
        }
        return lines.map(line => (
            <div key={line.id} style={{ position: 'relative' }}>
                <LineItem line={line} fontSize="inherit" />
                {activeTab === 'practice' && practice?.practiceData?.isAtGuildmaster && line.practiceSkill && (
                    <button
                        className="prac-button-inline"
                        style={{
                            position: 'absolute', right: '8px', top: '2px',
                            width: '18px', height: '18px', padding: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '4px'
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            executeCommand(`practice ${line.practiceSkill.name}`, true, true, true, true);
                            setTimeout(() => executeCommand('practice', true, true, true, true), 300);
                        }}
                    >+</button>
                )}
            </div>
        ));
    };

    return (
        <div className="character-view-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
            <div ref={infoContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', fontFamily: 'var(--font-main, monospace)', fontSize: tabFontSize }}>
                {activeTab === 'info' && renderLines(infoLines)}
                {activeTab === 'practice' && renderLines(practiceLines)}
                {activeTab === 'quests' && renderLines(questLines)}
                <div style={{ height: '60px' }} />
            </div>

            {/* Bottom Section: Tabs and Refresh */}
            <div style={{ position: 'absolute', bottom: '12px', left: '0', right: '0', display: 'flex', justifyContent: 'center', gap: '10px', pointerEvents: 'none' }}>
                <div style={{ display: 'flex', gap: '6px', pointerEvents: 'auto' }}>
                    {['info', 'practice', 'quests'].map((tab) => (
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
                            {tab === 'practice' ? 'Skills' : tab}
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

// Add useLayoutEffect import
import { useLayoutEffect } from 'react';
