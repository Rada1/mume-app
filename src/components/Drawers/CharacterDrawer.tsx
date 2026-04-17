import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, BookOpen, RefreshCw } from 'lucide-react';
import { useGame, useVitals, useUI } from '../../context/GameContext';
import { DrawerLine } from '../../types';
import { isObjectSelected } from '../../utils/selectionUtils';
import { getCategoryForName, COLOR_OBJ } from '../../utils/categorizationUtils';
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
    // Local activeTab state removed in favor of global ui.characterTab
    const { 
        practice,
        executeCommand: contextExecuteCommand,
        scoreLines,
        infoLines,
        questLines,
        practiceLines,
        selectedObjectIds,
        handleLogPointerDown,
        handleLogPointerUp,
        handleLogClick,
        clearObjectSelection,
        triggerHaptic
    } = useGame();
    const { characterInfo } = useVitals();
    const { ui, setUI, isLibraryOpen, setIsLibraryOpen } = useUI();
    const activeTab = ui.characterTab || 'info';
    const setActiveTab = (tab: 'info' | 'practice' | 'quests') => setUI((prev: any) => ({ ...prev, characterTab: tab }));
    
    // Prioritize context executeCommand if available, fallback to props
    const executeCommand = contextExecuteCommand || propsExecuteCommand;
    
    const practiceData = practice.practiceData;
    
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [tempTitle, setTempTitle] = useState('');

    const infoContainerRef = useRef<HTMLDivElement>(null);
    const [tabFontSize, setTabFontSize] = useState<string>('var(--dynamic-log-size, 14px)');

    useEffect(() => {
        if (!infoContainerRef.current) return;
        const measure = () => {
            const width = infoContainerRef.current?.clientWidth;
            // Scale font so 80 monospace chars fit safely within the padded container (24px padding)
            if (width) setTabFontSize(`${(width - 24) / 48}px`);
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(infoContainerRef.current);
        return () => ro.disconnect();
    }, [activeTab, isOpen, ui.characterTab]);

    // Silent refresh on open: old lines stay visible until new capture swaps in
    useEffect(() => {
        if (!isOpen) return;
        executeCommand('info', true, true, true, true);
        const t1 = setTimeout(() => executeCommand('quest', true, true, true, true), 100);
        const t2 = setTimeout(() => executeCommand('practice', true, true, true, true), 200);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [isOpen, executeCommand]);

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
        if (e.target === e.currentTarget && window.innerWidth > 1024) onClose();
    };

    const handleRefresh = (e: React.MouseEvent) => {
        e.stopPropagation();
        executeCommand('info', true);
        executeCommand('quest', true);
    };

    const swipePos = useRef<{ x: number, y: number } | null>(null);

    const onPointerDownInternal = (e: React.PointerEvent) => {
        const target = e.target as HTMLElement;
        const container = e.currentTarget as HTMLElement;
        if (target.closest('button') || target.closest('a') || target.closest('.inline-btn') || target.tagName === 'INPUT' || target.closest('.drawer-tab')) {
            if (target.closest('.inline-btn')) handleLogPointerDown(e);
            return;
        }
        swipePos.current = { x: e.clientX, y: e.clientY };
        container.setPointerCapture(e.pointerId);
    };

    const onPointerUpInternal = (e: React.PointerEvent) => {
        const target = e.target as HTMLElement;
        const container = e.currentTarget as HTMLElement;
        if (target.closest('button') || target.closest('a') || target.closest('.inline-btn') || target.tagName === 'INPUT' || target.closest('.drawer-tab')) {
            if (target.closest('.inline-btn')) handleLogPointerUp(e);
            return;
        }
        if (swipePos.current) {
            const deltaX = e.clientX - swipePos.current.x;
            const deltaY = e.clientY - swipePos.current.y;
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);

            if ((deltaY > 50 && absY > absX) || (deltaX > 40 && absX > absY)) {
                if (window.innerWidth > 1024) onClose();
            }
        }
        swipePos.current = null;
    };

    const onClickInternal = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const btn = target.closest('.inline-btn') as HTMLElement;
        if (btn) {
            handleLogClick(e);
        } else if (!target.closest('.drawer-tab')) {
            if (selectedObjectIds.size > 0) {
                clearObjectSelection();
                triggerHaptic(20);
            } else if (e.target === e.currentTarget) {
                if (window.innerWidth > 1024) onClose();
            }
        }
    };

    const DrawerLineItem = React.memo(({ 
        line, 
        selectedObjectIds, 
        fontSize,
        centered = false
    }: { 
        line: DrawerLine, 
        selectedObjectIds: Set<string>,
        fontSize: string,
        centered?: boolean
    }) => {
        const depth = line.depth || 0;
        const prefixId = 'statsLines';
        const cmdId = 'inline-obj-char';
        const fullId = `${prefixId}:${line.entityId || line.id}:${line.context || line.id}`;
        const isSelected = isObjectSelected(selectedObjectIds, fullId, cmdId);

        const cat = getCategoryForName(line.text);
        const isActuallyContainer = line.isContainer || cat === 'inline-containers';
        const brown = COLOR_OBJ;
        const dim = 'var(--text-primary)';

        if (line.isItem) {
            const articleMatch = line.text.match(/^(a |an |the |some )/i);
            const article = articleMatch ? articleMatch[1] : '';
            const afterArticle = line.text.slice(article.length);
            const condMatch = afterArticle.match(/\s+(\(.*\))$/i);
            const condition = condMatch ? condMatch[1] : '';
            const itemName = condMatch ? afterArticle.slice(0, afterArticle.length - condMatch[0].length) : afterArticle;

            return (
                <div style={{ display: 'block', whiteSpace: 'pre-wrap', textAlign: centered ? 'center' : 'left', lineHeight: '1.5', margin: '0', padding: '0', paddingLeft: centered ? '0' : `${depth * 8}px`, fontSize }}>
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
                            lineHeight: '1.5',
                            padding: '0',
                            margin: '0',
                            background: isSelected ? `${COLOR_OBJ}26` : 'transparent',
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

        const getClassColor = (skillClass?: string) => {
            if (!skillClass) return 'transparent';
            const cls = skillClass.toLowerCase();
            if (cls === 'warrior') return 'rgba(239, 68, 68, 0.15)'; // Red
            if (cls === 'none' || cls === 'ranger') return 'rgba(34, 197, 94, 0.15)'; // Green
            if (cls === 'cleric') return 'rgba(234, 179, 8, 0.22)'; // Holy Yellow
            if (cls === 'thief') return 'rgba(148, 163, 184, 0.15)'; // Silver/Grey
            if (cls === 'mage') return 'rgba(59, 130, 246, 0.22)'; // Arcane Blue
            return 'transparent';
        };

        const isAtGuildmaster = practice?.practiceData?.isAtGuildmaster;
        const bg = isAtGuildmaster ? 'transparent' : getClassColor(line.practiceSkill?.skillClass);

        if (line.practiceSkill) {
            const skill = line.practiceSkill;
            const isAtGuildmaster = practice?.practiceData?.isAtGuildmaster;

            return (
                <div 
                    className="skill-item-authentic" 
                    style={{ 
                        background: bg,
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        minHeight: '24px',
                        paddingRight: isAtGuildmaster ? '60px' : '8px'
                    }}
                >
                    <div 
                        style={{ flex: 1, fontFamily: 'var(--font-main, monospace)', whiteSpace: 'pre' }}
                        dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(line.html) }} 
                    />
                    {isAtGuildmaster && (
                        <button 
                            className="prac-button-inline"
                            style={{ 
                                position: 'absolute', 
                                right: '8px', 
                                width: '18px',
                                height: '18px',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginTop: '-1px'
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                contextExecuteCommand(`practice ${skill.name}`, true, true, true, true);
                                setTimeout(() => {
                                    contextExecuteCommand('practice', true, true, true, true);
                                }, 300);
                            }}
                        >
                            +
                        </button>
                    )}
                </div>
            );
        }

        const isHeader = !!line.isHeader;
        const rowBg = isHeader ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.6)';

        return (
            <div style={{ 
                textAlign: centered ? 'center' : 'left', 
                paddingLeft: centered ? '0' : `${depth * 8 + 8}px`, 
                paddingRight: '8px',
                lineHeight: '1.5',
                whiteSpace: 'pre', 
                fontSize,
                background: bg !== 'transparent' ? bg : rowBg,
                margin: '0.5px 0',
                paddingTop: '1px',
                paddingBottom: '1px',
                borderRadius: '4px',
                borderLeft: 'none',
                width: '100%',
                boxSizing: 'border-box',
                fontFamily: 'var(--font-main, monospace)'
            }} dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(line.html) }} />
        );
    });

    return (
        <div 
            className={`character-drawer-overlay ${isOpen ? 'open' : ''}`}
            onClick={handleBackdropClick}
        >
            <div
                className={`character-drawer-content log-card-drawer ${isOpen ? 'open' : ''}`}
                onClick={onClickInternal}
                onPointerDown={onPointerDownInternal}
                onPointerUp={onPointerUpInternal}
                onPointerCancel={onPointerUpInternal}
                style={{ touchAction: 'pan-y' }}
            >
                <div className="drawer-header" style={{ pointerEvents: 'auto', display: 'flex', justifyContent: 'flex-end', padding: '6px 10px', background: 'transparent' }}>
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
                    {activeTab === 'info' ? (
                        <div className="info-tab" style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <div ref={infoContainerRef} style={{
                                fontFamily: 'var(--font-main, monospace)',
                                fontSize: tabFontSize,
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

                                {infoLines?.length > 0 ? (
                                    infoLines.map(line => (
                                        <DrawerLineItem 
                                            key={line.id} 
                                            line={line} 
                                            selectedObjectIds={selectedObjectIds} 
                                            fontSize="inherit"
                                            centered={false}
                                        />
                                    ))
                                ) : (
                                    <div className="empty-state" style={{ textAlign: 'center', padding: '40px', opacity: 0.3 }}>
                                        <p style={{ fontSize: 'var(--dynamic-log-size, 16px)', fontStyle: 'italic' }}>No character data captured.</p>
                                    </div>
                                )}
                                <div style={{ height: '50px', flexShrink: 0 }} />
                            </div>
                        </div>
                    ) : activeTab === 'practice' ? (
                        <div className="practice-tab" style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <div ref={infoContainerRef} style={{
                                fontFamily: 'var(--font-main, monospace)',
                                fontSize: tabFontSize,
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

                                {practiceLines?.length > 0 ? (
                                    practiceLines.map(line => (
                                        <DrawerLineItem 
                                            key={line.id} 
                                            line={line} 
                                            selectedObjectIds={selectedObjectIds} 
                                            fontSize="inherit"
                                            centered={false}
                                        />
                                    ))
                                ) : (
                                    <div className="empty-state" style={{ textAlign: 'center', padding: '40px', opacity: 0.3 }}>
                                        <p style={{ fontSize: 'var(--dynamic-log-size, 16px)', fontStyle: 'italic' }}>No practice data captured.</p>
                                    </div>
                                )}
                                <div style={{ height: '50px', flexShrink: 0 }} />
                            </div>
                        </div>
                    ) : (
                        <div className="quests-tab" style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <div ref={infoContainerRef} style={{
                                fontFamily: 'var(--font-main, monospace)',
                                fontSize: tabFontSize,
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

                                {questLines?.length > 0 ? (
                                    questLines.map((line: any) => (
                                        <div key={line.id} style={{ textAlign: 'left', lineHeight: '1.5', whiteSpace: 'pre-wrap', fontSize: 'inherit' }} dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(line.html) }} />
                                    ))
                                ) : (
                                    <div className="empty-state" style={{ textAlign: 'center', padding: '40px', opacity: 0.3 }}>
                                        <p style={{ fontSize: 'var(--dynamic-log-size, 16px)', fontStyle: 'italic' }}>No quest data captured.</p>
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
                        className={`drawer-tab ${activeTab === 'info' ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); setActiveTab('info'); triggerHaptic(15); }}
                        style={{
                            padding: '6px 14px',
                            minWidth: '50px',
                            height: '24px',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            pointerEvents: 'auto',
                            background: activeTab === 'info' ? 'var(--accent)' : 'rgba(28, 28, 30, 0.4)',
                            backdropFilter: activeTab === 'info' ? 'none' : 'blur(10px) saturate(160%)',
                            WebkitBackdropFilter: activeTab === 'info' ? 'none' : 'blur(10px) saturate(160%)',
                            color: activeTab === 'info' ? '#000' : 'rgba(255,255,255,0.4)',
                            border: activeTab === 'info' ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.1)',
                            boxShadow: activeTab === 'info' ? '0 0 15px var(--accent-glow)' : '0 4px 12px rgba(0,0,0,0.3)',
                            transition: 'all 0.2s ease',
                            fontSize: '9px',
                            fontWeight: '900',
                            textTransform: 'uppercase',
                            letterSpacing: '0.8px'
                        }}
                    >
                        Info
                    </div>
                    <div 
                        className={`drawer-tab ${activeTab === 'practice' ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); setActiveTab('practice'); triggerHaptic(15); }}
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
                            background: activeTab === 'practice' ? 'var(--accent)' : 'rgba(28, 28, 30, 0.4)',
                            backdropFilter: activeTab === 'practice' ? 'none' : 'blur(10px) saturate(160%)',
                            WebkitBackdropFilter: activeTab === 'practice' ? 'none' : 'blur(10px) saturate(160%)',
                            color: activeTab === 'practice' ? '#000' : 'rgba(255,255,255,0.4)',
                            border: activeTab === 'practice' ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.1)',
                            boxShadow: activeTab === 'practice' ? '0 0 15px var(--accent-glow)' : '0 4px 12px rgba(0,0,0,0.3)',
                            transition: 'all 0.2s ease',
                            fontSize: '9px',
                            fontWeight: '900',
                            textTransform: 'uppercase',
                            letterSpacing: '0.8px'
                        }}
                    >
                        Skills
                    </div>
                    <div 
                        className={`drawer-tab ${activeTab === 'quests' ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); setActiveTab('quests'); triggerHaptic(15); }}
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
                            background: activeTab === 'quests' ? 'var(--accent)' : 'rgba(28, 28, 30, 0.4)',
                            backdropFilter: activeTab === 'quests' ? 'none' : 'blur(10px) saturate(160%)',
                            WebkitBackdropFilter: activeTab === 'quests' ? 'none' : 'blur(10px) saturate(160%)',
                            color: activeTab === 'quests' ? '#000' : 'rgba(255,255,255,0.4)',
                            border: activeTab === 'quests' ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.1)',
                            boxShadow: activeTab === 'quests' ? '0 0 15px var(--accent-glow)' : '0 4px 12px rgba(0,0,0,0.3)',
                            transition: 'all 0.2s ease',
                            fontSize: '9px',
                            fontWeight: '900',
                            textTransform: 'uppercase',
                            letterSpacing: '0.8px'
                        }}
                    >
                        Quests
                    </div>
                <button 
                    className="refresh-button floating-refresh"
                    title="Refresh"
                    onClick={(e) => {
                        triggerHaptic(15);
                        if (activeTab === 'info') { 
                            executeCommand('info', true, true, true, true);
                            executeCommand('quest', true, true, true, true);
                            practice.setSilentSyncPending(false); 
                        } else if (activeTab === 'practice') {
                            practice.setIsUiRequested(true);
                            executeCommand('practice', true, true, true, true);
                        } else {
                            executeCommand('quest', true, true, true, true);
                        }
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
                </div>
            </div>
        </div>
    );
};
