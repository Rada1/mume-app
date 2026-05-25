/**
 * @file HelpCard.tsx
 * @description A floating overlay card that displays MUME help data with 80-column monospace formatting.
 */

import React from 'react';
import { useViewport } from '../../hooks/useViewport';
import { X } from 'lucide-react';
import { ansiConvert } from '../../utils/ansi';
import { sanitizeMumeHtml } from '../../utils/securityUtils';
import { useSettingsStore } from '../../stores/useSettingsStore';

interface HelpCardProps {
    helpData: string;
    onClose: () => void;
    popoverRef?: React.RefObject<HTMLDivElement>;
    executeCommand?: (cmd: string, silent?: boolean, isSystem?: boolean) => void;
}

export const HelpCard: React.FC<HelpCardProps> = ({ 
    helpData, onClose, popoverRef, executeCommand 
}) => {
    const { isMobile, isLandscape } = useViewport();
    const isPortrait = isMobile && !isLandscape;
    const theme = useSettingsStore(state => state.theme);
    const isDarkMode = theme === 'dark';

    // --- Parsing Logic ---
    // Extract "See also" section to turn keywords into buttons
    // Broadened regex to handle quotes around names (e.g. "RULES BOARD") and common symbols
    const seeAlsoMatch = helpData.match(/See also:\s*([^\r\n]+)\.?\s*$/i);
    let mainText = helpData;
    let keywords: string[] = [];

    if (seeAlsoMatch) {
        mainText = helpData.substring(0, seeAlsoMatch.index).trim();
        // Split by comma and clean up keywords, removing surrounding quotes if present
        keywords = seeAlsoMatch[1].split(',').map(k => k.trim().replace(/^"(.*)"$/, '$1')).filter(k => k.length > 0);
    }

    // Convert help text to HTML with ANSI support
    const contentHtmlRaw = ansiConvert.toHtml(mainText);

    // Convert all CAPS words to clickable help button spans (length >= 2) with bright gold/yellow theming (#ffcc00), avoiding HTML tags/attributes
    const contentHtml = contentHtmlRaw.replace(/(<[^>]+>)|(\b[A-Z]{2,}\b)/g, (match, tag, word) => {
        if (tag) return tag;
        return `<span class="help-topic-btn" data-cmd="${word}" style="color: #ffcc00; cursor: pointer; font-weight: bold; padding: 1px 4px; background: rgba(255, 204, 0, 0.1); border: 1px solid rgba(255, 204, 0, 0.25); border-radius: 4px; display: inline-block; margin: 1px 0;">${word}</span>`;
    });

    const handleContentClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const btn = target.closest('.help-topic-btn') as HTMLElement;
        if (btn) {
            const topic = btn.getAttribute('data-cmd');
            if (topic && executeCommand) {
                executeCommand(topic.toLowerCase() === 'help' ? 'help' : `help ${topic}`);
            }
        }
    };

    return (
        <div 
            className="floating-group-card-overlay" 
            onClick={onClose} 
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 30000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0, 0, 0, 0.6)',
                padding: isMobile ? '0' : '20px'
            }}
        >
            <div className="floating-group-card help-card" ref={popoverRef} onClick={(e) => e.stopPropagation()} style={{
                width: isMobile ? '100%' : '100%',
                left: isMobile ? 0 : 'auto',
                maxWidth: isMobile ? '100%' : '800px',
                margin: 0,
                height: 'auto',
                maxHeight: isMobile ? '65vh' : '80vh',
                background: isDarkMode ? 'rgba(24, 24, 27, 0.4)' : 'rgba(245, 245, 247, 0.6)',
                backdropFilter: 'blur(25px)',
                WebkitBackdropFilter: 'blur(25px)',
                border: isMobile ? 'none' : (isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)'),
                borderLeft: isMobile ? 'none' : undefined,
                borderRight: isMobile ? 'none' : undefined,
                boxShadow: isMobile ? 'none' : '0 20px 50px rgba(0, 0, 0, 0.8)',
                borderRadius: isMobile ? '0' : '12px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative',
                transform: 'none',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                <div className="card-header" style={{
                    padding: '12px 20px',
                    borderBottom: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'transparent',
                    minHeight: '50px'
                }}>
                    <h3 style={{ 
                        margin: 0, 
                        color: '#ffcc00', 
                        fontSize: '0.9rem', 
                        letterSpacing: '1.5px', 
                        textTransform: 'uppercase',
                        fontWeight: 800
                    }}>
                        MUME HELP
                    </h3>

                    <button onClick={onClose} style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        color: isDarkMode ? '#fff' : '#000',
                        width: '32px',
                        height: '32px',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                    >
                        <X size={18} />
                    </button>
                </div>
                
                <div className="card-content" style={{
                    padding: '12px',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    flex: 1,
                    background: 'transparent',
                    display: 'flex',
                    flexDirection: 'column',
                    containerType: 'inline-size',
                    overscrollBehavior: 'contain'
                }}>
                    <pre 
                        onClick={handleContentClick}
                        style={{
                            margin: 0,
                            fontFamily: 'var(--font-mono, "Cascadia Code", monospace)',
                            // Dynamic font size to fit exactly 80 characters.
                            fontSize: isPortrait 
                                ? 'clamp(7px, calc((100cqw - 24px) / 48), 16px)' 
                                : 'clamp(10px, calc((100cqw - 24px) / 48), 15px)',
                            lineHeight: '1.25',
                            color: isDarkMode ? '#ccc' : '#222',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'normal',
                            width: '100%'
                        }}
                        dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(contentHtml) }}
                    />

                    {keywords.length > 0 && (
                        <div style={{
                            marginTop: '20px',
                            paddingTop: '15px',
                            borderTop: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: '0.8rem'
                        }}>
                            <span style={{ color: isDarkMode ? '#888' : '#555', marginRight: '8px' }}>See also:</span>
                            <div style={{ 
                                display: 'inline-flex', 
                                flexWrap: 'wrap', 
                                gap: '8px', 
                                marginTop: isPortrait ? '8px' : '0' 
                            }}>
                                {keywords.map(kw => (
                                    <span 
                                        key={kw}
                                        className="inline-btn"
                                        onClick={() => executeCommand?.(kw.toLowerCase() === 'help' ? 'help' : `help ${kw}`)}
                                        style={{
                                            color: '#ffcc00',
                                            textDecoration: 'none',
                                            cursor: 'pointer',
                                            fontWeight: 'bold',
                                            padding: '2px 8px',
                                            background: 'rgba(255, 204, 0, 0.1)',
                                            borderRadius: '4px',
                                            border: '1px solid rgba(255, 204, 0, 0.2)',
                                            transition: 'all 0.2s ease',
                                            textTransform: 'uppercase'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(255, 204, 0, 0.2)';
                                            e.currentTarget.style.borderColor = '#ffcc00';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(255, 204, 0, 0.1)';
                                            e.currentTarget.style.borderColor = 'rgba(255, 204, 0, 0.2)';
                                        }}
                                    >
                                        {kw}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="card-footer" style={{
                    padding: '8px 20px',
                    borderTop: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
                    display: 'flex',
                    justifyContent: 'center',
                    background: 'transparent'
                }}>
                    <button 
                        onClick={onClose}
                        style={{
                            background: '#ffcc00',
                            color: '#000',
                            border: 'none',
                            padding: '6px 24px',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#ffe57f';
                            e.currentTarget.style.boxShadow = '0 0 10px rgba(255, 204, 0, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#ffcc00';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        Exit Help
                    </button>
                </div>
            </div>
        </div>
    );
};
