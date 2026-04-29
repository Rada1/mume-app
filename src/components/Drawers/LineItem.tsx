/**
 * @file LineItem.tsx
 * @description Generic line renderer for drawers using TokenRenderer.
 */

import React from 'react';
import { DrawerLine, MessageType } from '../../types';
import { sanitizeMumeHtml } from '../../utils/securityUtils';
import { extractMumeKeyword } from '../../utils/gameUtils';
import { ansiConvert } from '../../utils/ansi';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { COLOR_OBJ } from '../../utils/categorizationUtils';
import { TokenRenderer } from '../Messages/TokenRenderer';

interface LineItemProps {
    line: DrawerLine;
    fontSize?: string;
    style?: React.CSSProperties;
    location?: 'carried' | 'inv' | 'worn' | 'room';
    category?: string;
}

interface TokenMetadata {
    id?: string;
    context?: string;
    kind?: string;
    location?: string;
    category?: string;
    cmd?: string;
    action?: string;
}

export const LineItem: React.FC<LineItemProps> = ({ 
    line, 
    fontSize, 
    style,
    location,
    category
}) => {
    const objectColor = useSettingsStore(s => s.objectColor) || COLOR_OBJ;
    const depth = line.depth || 0;
    const isHeader = !!line.isHeader;
    const lineContext = line.context || extractMumeKeyword(line.text);
    const tokenMetadata: TokenMetadata = line.isItem
        ? {
            id: line.entityId || line.stableId || line.id,
            context: lineContext,
            kind: 'object',
            location,
            category,
            cmd: line.cmd,
            action: 'menu'
        }
        : {
            context: line.context,
            cmd: line.cmd
        };
    
    const baseStyle: React.CSSProperties = {
        background: isHeader ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.6)',
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
                    data-cmd={line.cmd || category || 'inline-obj-char'}
                    data-context={objectContext}
                    data-kind="object"
                    data-location={location}
                    data-category="object"
                    data-action="menu"
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

    if (hasObjectXml) {
        return (
            <div style={baseStyle}>
                <div
                    className="message-content"
                    style={{ display: 'block', whiteSpace: 'pre', lineHeight: 'inherit' }}
                >
                    {line.prefix && <span style={{ opacity: 0.6 }}>{line.prefix}</span>}
                    {renderObjectXmlLine()}
                </div>
            </div>
        );
    }

    if (line.tokens && line.tokens.length > 0) {
        return (
            <div style={baseStyle}>
                <div 
                    className="message-content"
                    style={{ display: 'block', whiteSpace: 'pre', lineHeight: 'inherit' }}
                >
                    {line.prefix && <span style={{ opacity: 0.6 }}>{line.prefix}</span>}
                    <TokenRenderer 
                        tokens={line.tokens} 
                        type={line.isItem ? 'inventory' as MessageType : 'room' as MessageType}
                        metadata={tokenMetadata}
                        forceBoldEntities
                    />
                </div>
            </div>
        );
    }

    return (
            <div style={baseStyle}>
                <div 
                    className="message-content"
                    style={{ display: 'block', whiteSpace: 'pre', lineHeight: 'inherit' }}
                >
                    {line.prefix && <span style={{ opacity: 0.6 }}>{line.prefix}</span>}
                    {line.isItem ? (
                        <span
                            className="inline-btn"
                            data-id={line.entityId || line.stableId || line.id}
                            data-cmd={line.cmd || category || 'inline-obj-char'}
                            data-context={lineContext}
                            data-kind="object"
                            data-location={location}
                            data-category="object"
                            data-action="menu"
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
                </div>
            </div>
        );
};
