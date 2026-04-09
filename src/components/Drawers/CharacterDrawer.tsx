import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, BookOpen, ChevronRight, RefreshCw, ScrollText, Save, RotateCcw } from 'lucide-react';
import { useGame, useVitals } from '../../context/GameContext';
import { DrawerLine } from '../../types';
import { isObjectSelected } from '../../utils/selectionUtils';
import { getCategoryForName } from '../../utils/categorizationUtils';
import { sanitizeMumeHtml } from '../../utils/securityUtils';
import './CharacterDrawer.css';

interface CharacterDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
}

export const CharacterDrawer: React.FC<CharacterDrawerProps> = ({
    isOpen,
    onClose,
    executeCommand: propsExecuteCommand
}) => {
    const [activeTab, setActiveTab] = useState<'info' | 'practice' | 'quests'>('info');
    const { 
        practice, 
        quests, 
        executeCommand: contextExecuteCommand,
        statsLines,
        practiceLines,
        selectedObjectIds,
        handleLogClick
    } = useGame();
    const { characterInfo } = useVitals();
    
    // Prioritize context executeCommand if available, fallback to props
    const executeCommand = contextExecuteCommand || propsExecuteCommand;
    
    const practiceData = practice.practiceData;
    
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [tempTitle, setTempTitle] = useState('');

    const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
    const questPointerStartRef = useRef<{ x: number; y: number; id: string } | null>(null);

    const infoContainerRef = useRef<HTMLDivElement>(null);
    const [infoFontSize, setInfoFontSize] = useState<string>('inherit');

    useEffect(() => {
        if (!infoContainerRef.current || (activeTab !== 'info' && activeTab !== 'practice')) return;
        const measure = () => {
            const width = infoContainerRef.current?.clientWidth;
            if (width) setInfoFontSize(`${width / 48}px`);
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(infoContainerRef.current);
        return () => ro.disconnect();
    }, [activeTab, isOpen]);

    useEffect(() => {
        if (isOpen && characterInfo) {
            if (!isEditingTitle) setTempTitle(characterInfo.name || '');
        }
    }, [isOpen, characterInfo, isEditingTitle]);

    const handleSaveTitle = () => {
        executeCommand(`change title ${tempTitle}`);
        setIsEditingTitle(false);
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
    };

    const handleRefresh = (e: React.MouseEvent) => {
        e.stopPropagation();
        executeCommand('info', true);
        executeCommand('score', true);
        executeCommand('quest', true);
    };

    const swipePos = useRef<{ x: number, y: number } | null>(null);

    const DrawerLineItem = React.memo(({ 
        line, 
        selectedObjectIds, 
        fontSize 
    }: { 
        line: DrawerLine, 
        selectedObjectIds: Set<string>,
        fontSize: string
    }) => {
        const depth = line.depth || 0;
        const prefixId = 'statsLines';
        const cmdId = 'inline-obj-char';
        const fullId = `${prefixId}:${line.entityId || line.id}:${line.context || line.id}`;
        const isSelected = isObjectSelected(selectedObjectIds, fullId, cmdId);

        const cat = getCategoryForName(line.text);
        const isActuallyContainer = line.isContainer || cat === 'inline-containers';
        const brown = 'rgba(180, 100, 50, 0.9)';
        const dim = 'rgba(255,255,255,0.4)';

        if (line.isItem) {
            const articleMatch = line.text.match(/^(a |an |the |some )/i);
            const article = articleMatch ? articleMatch[1] : '';
            const afterArticle = line.text.slice(article.length);
            const condMatch = afterArticle.match(/\s+(\((flawless|well-maintained|worn|scratched|damaged|beaten|battered|beaten and battered|shabby|sub-standard|poor|fragmented|broken|shattered)\))$/i);
            const condition = condMatch ? condMatch[1] : '';
            const itemName = condMatch ? afterArticle.slice(0, afterArticle.length - condMatch[0].length) : afterArticle;

            return (
                <div style={{ display: 'block', whiteSpace: 'pre', lineHeight: '1.2', margin: '0', padding: '0', paddingLeft: `${depth * 8}px`, fontSize }}>
                    {line.prefix && <span style={{ color: dim }}>{line.prefix}</span>}
                    <span style={{ color: dim }}>{article}</span>
                    <span
                        className={`inline-btn auto-item ${isSelected ? 'selected-item' : ''} ${isActuallyContainer ? 'is-container' : ''}`}
                        data-id={fullId}
                        data-line-id={line.id}
                        data-context={line.context || line.id}
                        data-action="menu"
                        data-category={cat || undefined}
                        data-cmd={cmdId}
                        style={{
                            display: 'inline',
                            lineHeight: '1.2',
                            padding: '0',
                            margin: '0',
                            background: isSelected ? `rgba(180,100,50,0.15)` : 'transparent',
                            border: 'none',
                            borderRadius: '0',
                            boxShadow: 'none',
                            cursor: 'default',
                            color: brown,
                            whiteSpace: 'pre',
                        }}
                    >{itemName}</span>
                    {condition && <span style={{ color: dim }}> {condition}</span>}
                </div>
            );
        }

        return (
            <div style={{ paddingLeft: `${depth * 8}px`, lineHeight: '1.2', whiteSpace: 'pre-wrap', fontSize }} dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(line.html) }} />
        );
    });

    return (
        <div 
            className={`character-drawer-overlay ${isOpen ? 'open' : ''}`}
            onClick={handleBackdropClick}
        >
            <div
                className={`character-drawer-content log-card-drawer ${isOpen ? 'open' : ''}`}
                onClick={(e) => { 
                    const target = e.target as HTMLElement;
                    if (target.closest('.inline-btn')) {
                        handleLogClick(e);
                    } else if (e.target === e.currentTarget) {
                        onClose();
                    } else {
                        e.stopPropagation(); 
                    }
                }}
                onPointerDown={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest('button') || target.closest('a') || target.closest('.inline-btn') || target.tagName === 'INPUT') return;
                    swipePos.current = { x: e.clientX, y: e.clientY };
                    e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerUp={(e) => {
                    if (swipePos.current) {
                        const deltaX = e.clientX - swipePos.current.x;
                        const deltaY = e.clientY - swipePos.current.y;
                        const absX = Math.abs(deltaX);
                        const absY = Math.abs(deltaY);

                        if ((deltaY > 50 && absY > absX) || (deltaX > 40 && absX > absY)) {
                            onClose();
                        }
                    }
                    swipePos.current = null;
                }}
                onPointerCancel={() => {
                    swipePos.current = null;
                }}
                style={{ touchAction: 'pan-y' }}
            >
                <div className="drawer-header" style={{ pointerEvents: 'auto', display: 'flex', justifyContent: 'flex-end', padding: '6px 10px', background: 'transparent' }}>
                    <button 
                        style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', width: '28px', height: '28px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} 
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="side-tabs-container" style={{
                    position: 'absolute',
                    right: '4px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    zIndex: 100,
                    pointerEvents: 'auto'
                }}>
                    <div 
                        className={`drawer-tab ${activeTab === 'info' ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); setActiveTab('info'); }}
                        style={{
                            width: '18px',
                            height: '50px',
                            borderRadius: '9px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            background: activeTab === 'info' ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                            color: activeTab === 'info' ? '#000' : 'rgba(255,255,255,0.3)',
                            border: activeTab === 'info' ? 'none' : '1px solid rgba(255,255,255,0.05)',
                            transition: 'all 0.2s ease',
                            writingMode: 'vertical-rl',
                            textOrientation: 'mixed',
                            fontSize: '7px',
                            fontWeight: '900',
                            textTransform: 'uppercase',
                            letterSpacing: '0.2px'
                        }}
                    >
                        Info
                    </div>
                    <div 
                        className={`drawer-tab ${activeTab === 'practice' ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); setActiveTab('practice'); }}
                        style={{
                            width: '18px',
                            height: '65px',
                            borderRadius: '9px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            background: activeTab === 'practice' ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                            color: activeTab === 'practice' ? '#000' : 'rgba(255,255,255,0.3)',
                            border: activeTab === 'practice' ? 'none' : '1px solid rgba(255,255,255,0.05)',
                            transition: 'all 0.2s ease',
                            writingMode: 'vertical-rl',
                            textOrientation: 'mixed',
                            fontSize: '7px',
                            fontWeight: '900',
                            textTransform: 'uppercase',
                            letterSpacing: '0.2px'
                        }}
                    >
                        Skills
                    </div>
                    <div 
                        className={`drawer-tab ${activeTab === 'quests' ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); setActiveTab('quests'); }}
                        style={{
                            width: '18px',
                            height: '60px',
                            borderRadius: '9px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            background: activeTab === 'quests' ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                            color: activeTab === 'quests' ? '#000' : 'rgba(255,255,255,0.3)',
                            border: activeTab === 'quests' ? 'none' : '1px solid rgba(255,255,255,0.05)',
                            transition: 'all 0.2s ease',
                            writingMode: 'vertical-rl',
                            textOrientation: 'mixed',
                            fontSize: '7px',
                            fontWeight: '900',
                            textTransform: 'uppercase',
                            letterSpacing: '0.2px'
                        }}
                    >
                        Quests
                    </div>
                </div>

                <div className="drawer-body" style={{ pointerEvents: 'auto', marginRight: '22px' }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
                    {activeTab === 'info' ? (
                        <div className="info-tab" style={{ position: 'relative' }}>
                            <div ref={infoContainerRef} style={{
                                fontFamily: 'var(--font-main, monospace)',
                                fontSize: infoFontSize,
                                lineHeight: '1.2',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0',
                                background: 'rgba(10, 13, 21, 0.35)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '16px',
                                padding: '16px 12px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                margin: '8px 0',
                                position: 'relative',
                                minHeight: '120px'
                            }}>
                                <button className="refresh-button" 
                                    onClick={(e) => { handleRefresh(e); practice.setSilentSyncPending(false); }} 
                                    style={{ 
                                        position: 'absolute',
                                        top: '12px',
                                        right: '12px',
                                        zIndex: 10,
                                        background: 'rgba(255,255,255,0.08)', 
                                        border: '1px solid rgba(255,255,255,0.1)', 
                                        color: 'rgba(255,255,255,0.6)', 
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '16px', 
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        backdropFilter: 'blur(4px)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                                        e.currentTarget.style.color = '#fff';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                        e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                                    }}
                                    title="Refresh"
                                >
                                    <RefreshCw size={16} />
                                </button>

                                {statsLines?.length > 0 ? (
                                    statsLines.map(line => (
                                        <DrawerLineItem 
                                            key={line.id} 
                                            line={line} 
                                            selectedObjectIds={selectedObjectIds} 
                                            fontSize={infoFontSize} 
                                        />
                                    ))
                                ) : (
                                    <div className="empty-state" style={{ textAlign: 'center', padding: '40px', opacity: 0.3 }}>
                                        <p style={{ fontSize: 'var(--dynamic-log-size, 16px)', fontStyle: 'italic' }}>No character data captured.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : activeTab === 'practice' ? (
                        <div className="practice-tab" style={{ position: 'relative' }}>
                            <div ref={infoContainerRef} style={{
                                fontFamily: 'var(--font-main, monospace)',
                                fontSize: infoFontSize,
                                lineHeight: '1.2',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0',
                                background: 'rgba(10, 13, 21, 0.35)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '16px',
                                padding: '16px 12px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                margin: '8px 0',
                                position: 'relative',
                                minHeight: '120px'
                            }}>
                                <button className="refresh-button" 
                                    onClick={() => { practice.setIsUiRequested(true); executeCommand('practice'); }} 
                                    style={{ 
                                        position: 'absolute',
                                        top: '12px',
                                        right: '12px',
                                        zIndex: 10,
                                        background: 'rgba(255,255,255,0.08)', 
                                        border: '1px solid rgba(255,255,255,0.1)', 
                                        color: 'rgba(255,255,255,0.6)', 
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '16px', 
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        backdropFilter: 'blur(4px)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                                        e.currentTarget.style.color = '#fff';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                        e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                                    }}
                                    title="Refresh"
                                >
                                    <RefreshCw size={16} />
                                </button>

                                {practiceLines?.length > 0 ? (
                                    practiceLines.map(line => (
                                        <DrawerLineItem 
                                            key={line.id} 
                                            line={line} 
                                            selectedObjectIds={selectedObjectIds} 
                                            fontSize={infoFontSize} 
                                        />
                                    ))
                                ) : (
                                    <div className="empty-state" style={{ textAlign: 'center', padding: '40px', opacity: 0.3 }}>
                                        <p style={{ fontSize: 'var(--dynamic-log-size, 16px)', fontStyle: 'italic' }}>No practice data captured.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="quests-tab">
                            <div className="quests-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', padding: '0 5px' }}>
                                <div className="quests-badge" style={{ background: 'rgba(184, 134, 11, 0.1)', color: '#b8860b', border: '1px solid rgba(184, 134, 11, 0.3)', padding: '4px 12px', borderRadius: '12px', fontSize: 'var(--dynamic-log-size, 16px)', fontWeight: '800' }}>
                                    {quests.activeQuests.length} Active
                                </div>
                                <button className="refresh-button" 
                                    onClick={() => executeCommand('quest')} 
                                    style={{ 
                                        background: 'rgba(255,255,255,0.08)', 
                                        border: '1px solid rgba(255,255,255,0.1)', 
                                        color: 'rgba(255,255,255,0.6)', 
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '16px', 
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        backdropFilter: 'blur(4px)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                                        e.currentTarget.style.color = '#fff';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                        e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                                    }}
                                    title="Refresh"
                                >
                                    <RefreshCw size={16} />
                                </button>
                            </div>

                            <div className="quests-list">
                                {quests.activeQuests && quests.activeQuests.length > 0 ? (
                                    quests.activeQuests.map((quest) => (
                                        <div
                                            key={quest.id}
                                            className={`quest-item ${selectedQuestId === quest.id ? 'selected' : ''}`}
                                            onPointerDown={(e) => {
                                                questPointerStartRef.current = { x: e.clientX, y: e.clientY, id: quest.id };
                                            }}
                                            onPointerUp={(e) => {
                                                const start = questPointerStartRef.current;
                                                if (!start || start.id !== quest.id) return;
                                                const dx = Math.abs(e.clientX - start.x);
                                                const dy = Math.abs(e.clientY - start.y);
                                                questPointerStartRef.current = null;
                                                if (dx < 10 && dy < 10) {
                                                    const isExpanding = quest.id !== selectedQuestId;
                                                    setSelectedQuestId(isExpanding ? quest.id : null);
                                                    if (isExpanding) executeCommand(`quest ${quest.name.split(' ')[0].toLowerCase()}`);
                                                }
                                            }}
                                            style={{
                                                background: 'rgba(10, 13, 21, 0.35)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: '16px',
                                                padding: '15px',
                                                marginBottom: '8px',
                                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
                                            }}
                                        >
                                            <div className="quest-info" style={{ flex: 1 }}>
                                                <div className="quest-area" style={{ fontSize: 'var(--dynamic-log-size, 16px)', color: '#b8860b', fontWeight: '800', marginBottom: '2px' }}>{quest.area}</div>
                                                <div className="quest-name" style={{ fontSize: 'var(--dynamic-log-size, 16px)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    {quest.isUnfinished && <span style={{ color: '#fb923c' }}>*</span>}
                                                    {quest.name}
                                                </div>
                                                {selectedQuestId === quest.id ? (
                                                    <div className="quest-full-text" style={{ 
                                                        marginTop: '12px', 
                                                        padding: '12px',
                                                        background: 'rgba(0,0,0,0.2)',
                                                        borderRadius: '8px',
                                                        borderLeft: '2px solid var(--accent)',
                                                        fontSize: 'var(--dynamic-log-size, 16px)', 
                                                        lineHeight: '1.4',
                                                        color: '#e2e8f0',
                                                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                                                    }}>
                                                        {quest.fullText ? quest.fullText.split('\n').map((line, i) => (
                                                            <p key={i} style={{ marginBottom: '8px' }}>{line}</p>
                                                        )) : (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.5, fontStyle: 'italic' }}>
                                                                Fetching details...
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="quest-description" style={{ fontSize: 'var(--dynamic-log-size, 16px)', opacity: 0.5, marginTop: '2px' }}>{quest.description}</div>
                                                )}
                                            </div>
                                            <ChevronRight size={14} style={{ opacity: 0.3, transform: selectedQuestId === quest.id ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                                        </div>
                                    ))
                                ) : (
                                    <div className="empty-state" style={{ textAlign: 'center', padding: '40px', opacity: 0.3 }}>
                                        <ScrollText size={32} style={{ marginBottom: '10px' }} />
                                        <p style={{ fontSize: 'var(--dynamic-log-size, 16px)' }}>No active quests.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
