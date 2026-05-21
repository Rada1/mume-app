/**
 * @file LineItem.tsx
 * @description Generic line renderer for drawers using TokenRenderer.
 */

import React from 'react';
import { DrawerLine, MessageType } from '../../types';
import { sanitizeMumeHtml } from '../../utils/securityUtils';
import { extractMumeKeyword, isItemContainer } from '../../utils/gameUtils';
import { ansiConvert } from '../../utils/ansi';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { COLOR_OBJ } from '../../utils/categorizationUtils';
import { getPracticeClassKey } from '../../utils/practiceClassCatalog';
import { rememberLastPracticedSkill } from '../../utils/practiceLastSkillMemory';
import { TokenRenderer } from '../Messages/TokenRenderer';

interface LineItemProps {
    line: DrawerLine;
    fontSize?: string;
    style?: React.CSSProperties;
    category?: string;
    isExpanded?: boolean;
    isLoading?: boolean;
    onToggleExpand?: () => void;
    parentNoun?: string;
}

interface TokenMetadata {
    id?: string;
    context?: string;
    category?: string;
    cmd?: string;
    action?: string;
}

const SKILL_CLASS_COLORS: Record<string, string> = {
    warrior: '#ef4444',
    ranger: '#22c55e',
    none: '#22c55e',
    mage: '#3b82f6',
    cleric: '#fbbf24',
    thief: '#cbd5e1'
};

const getPracticeClassColor = (lineText: string, skillName: string): string => {
    const classMatch = lineText.match(/\b(warrior|ranger|mage|cleric|thief|none)\b(?:\s+\d+)?\s*$/i);
    const classKey = classMatch?.[1]?.toLowerCase() || getPracticeClassKey(skillName) || 'none';
    return SKILL_CLASS_COLORS[classKey] || SKILL_CLASS_COLORS.none;
};

export const LineItem: React.FC<LineItemProps> = ({ 
    line, 
    fontSize, 
    style,
    category,
    isExpanded,
    isLoading,
    onToggleExpand,
    parentNoun
}) => {
    const objectColor = useSettingsStore(s => s.objectColor) || COLOR_OBJ;
    const depth = line.depth || 0;
    const isHeader = !!line.isHeader;
    const lineContext = line.context || extractMumeKeyword(line.text);
    const isCommandLine = line.cmd === 'practice %n';
    const tokenMetadata: TokenMetadata = line.isItem
        ? {
            id: line.entityId || line.stableId || line.id,
            context: lineContext,
            category,
            cmd: line.cmd || category,
            action: isCommandLine ? 'command' : 'menu'
        }
        : {
            context: line.context,
            cmd: line.cmd
        };
    
    const baseStyle: React.CSSProperties = {
        background: isHeader ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
        borderRadius: '4px',
        margin: '0.5px 0',
        padding: '1px 10px',
        paddingLeft: `${depth * 8 + 10}px`,
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        minHeight: '16px',
        lineHeight: '1.5',
        color: isHeader ? '#ffffff' : 'inherit',
        fontSize: fontSize || 'inherit',
        whiteSpace: 'pre',
        ...style
    };

    const renderObjectXmlLine = () => {
        const raw = line.rawText || line.html || line.text;
        const objectRegex = /<object[^>]*>(.*?)<\/object>/gi;
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = objectRegex.exec(raw)) !== null) {
            if (match.index > lastIndex) {
                parts.push(
                    <span
                        key={`text-${lastIndex}`}
                        dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(ansiConvert.toHtml(raw.slice(lastIndex, match.index))) }}
                    />
                );
            }

            const objectName = match[1].replace(/<[^>]*>/g, '').replace(/\x1b\[[0-9;]*m/g, '').trim();
            const objectContext = line.context || extractMumeKeyword(objectName);
            parts.push(
                <span
                    key={`obj-${match.index}`}
                    className="inline-btn"
                    data-id={line.entityId || line.stableId || line.id}
                    data-cmd={parentNoun ? 'inline-container-item' : (line.cmd || category || 'inline-inventory')}
                    data-context={objectContext}
                    data-category={parentNoun ? 'inline-container-item' : category}
                    data-action={isCommandLine ? 'command' : 'menu'}
                    data-from-drawer={isCommandLine ? 'true' : undefined}
                    data-parent-noun={parentNoun}
                    style={{
                        '--glow-color': objectColor,
                        color: 'var(--glow-color)',
                        fontWeight: 800
                    } as React.CSSProperties}
                >
                    {objectName}
                </span>
            );
            lastIndex = objectRegex.lastIndex;
        }

        if (lastIndex < raw.length) {
            parts.push(
                <span
                    key={`text-${lastIndex}`}
                    dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(ansiConvert.toHtml(raw.slice(lastIndex))) }}
                />
            );
        }

        return parts;
    };

    const hasObjectXml = line.isItem && /<object[^>]*>.*?<\/object>/i.test(line.rawText || line.html || line.text);
    const showChevron = line.isItem && isItemContainer(line.text);

    const renderChevron = () => (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onToggleExpand?.();
            }}
            style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.4)',
                cursor: 'pointer',
                padding: '2px 6px',
                marginLeft: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.2s, color 0.2s',
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)';
            }}
            title={isExpanded ? "Collapse container" : "Expand container"}
        >
            {isLoading ? (
                <span style={{ fontSize: '10px', display: 'inline-block', transformOrigin: 'center' }}>⌛</span>
            ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            )}
        </button>
    );

    if (isCommandLine) {
        const match = line.text.match(/^(.+?)(\s{2,}.*)$/);
        const skillName = line.context || match?.[1]?.trim() || line.text.trim();
        const rest = match?.[2] || '';
        const skillColor = getPracticeClassColor(line.text, skillName);

        return (
            <div style={baseStyle}>
                <div
                    className="message-content"
                    style={{ display: 'block', whiteSpace: 'pre', lineHeight: 'inherit' }}
                >
                    <span
                        className="inline-btn"
                        data-id={line.entityId || line.stableId || line.id}
                        data-cmd="practice %n"
                        data-context={skillName}
                        data-category="cat-practice-skill"
                        data-action="command"
                        data-from-drawer="true"
                        onPointerDownCapture={() => rememberLastPracticedSkill(skillName)}
                        style={{
                            '--glow-color': skillColor,
                            color: 'var(--glow-color)',
                            fontWeight: 800
                        } as React.CSSProperties}
                    >
                        {skillName}
                    </span>
                    <span>{rest}</span>
                </div>
            </div>
        );
    }

    if (hasObjectXml) {
        return (
            <div style={baseStyle}>
                <div
                    className="message-content"
                    style={{ display: 'flex', alignItems: 'center', whiteSpace: 'pre', lineHeight: 'inherit' }}
                >
                    {line.prefix && <span style={{ opacity: 0.6 }}>{line.prefix}</span>}
                    {renderObjectXmlLine()}
                    {showChevron && renderChevron()}
                </div>
            </div>
        );
    }

    if (line.tokens && line.tokens.length > 0) {
        return (
            <div style={baseStyle}>
                <div 
                    className="message-content"
                    style={{ display: 'flex', alignItems: 'center', whiteSpace: 'pre', lineHeight: 'inherit' }}
                >
                    {line.prefix && <span style={{ opacity: 0.6 }}>{line.prefix}</span>}
                    <TokenRenderer 
                        tokens={line.tokens} 
                        type={line.isItem ? 'inventory' as MessageType : 'room' as MessageType}
                        metadata={tokenMetadata}
                        forceBoldEntities
                    />
                    {showChevron && renderChevron()}
                </div>
            </div>
        );
    }

    return (
            <div style={baseStyle}>
                <div 
                    className="message-content"
                    style={{ display: 'flex', alignItems: 'center', whiteSpace: 'pre', lineHeight: 'inherit' }}
                >
                    {line.prefix && <span style={{ opacity: 0.6 }}>{line.prefix}</span>}
                    {line.isItem ? (
                        <span
                            className="inline-btn"
                            data-id={line.entityId || line.stableId || line.id}
                            data-cmd={parentNoun ? 'inline-container-item' : (line.cmd || category || 'inline-inventory')}
                            data-context={lineContext}
                            data-category={parentNoun ? 'inline-container-item' : category}
                            data-action={isCommandLine ? 'command' : 'menu'}
                            data-from-drawer={isCommandLine ? 'true' : undefined}
                            data-parent-noun={parentNoun}
                            style={{
                                '--glow-color': objectColor,
                                color: 'var(--glow-color)',
                                fontWeight: 800
                            } as React.CSSProperties}
                        >
                            {line.text}
                        </span>
                    ) : (
                        <span dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(line.html || line.text) }} />
                    )}
                    {showChevron && renderChevron()}
                </div>
            </div>
        );
};
