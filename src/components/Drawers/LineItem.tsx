/**
 * @file LineItem.tsx
 * @description Generic line renderer for drawers using TokenRenderer.
 */

import React from 'react';
import { DrawerLine, MessageType } from '../../types';
import { sanitizeMumeHtml } from '../../utils/securityUtils';
import { TokenRenderer } from '../Messages/TokenRenderer';

interface LineItemProps {
    line: DrawerLine;
    fontSize?: string;
    style?: React.CSSProperties;
    location?: 'inv' | 'worn' | 'room';
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
    const depth = line.depth || 0;
    const isHeader = !!line.isHeader;
    const tokenMetadata: TokenMetadata = line.isItem
        ? {
            id: line.entityId || line.stableId || line.id,
            context: line.context,
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
                    />
                </div>
            </div>
        );
    }

    return (
        <div style={baseStyle}>
            <div 
                style={{ display: 'block', whiteSpace: 'pre', lineHeight: 'inherit' }}
                dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(line.html || line.text) }} 
            />
        </div>
    );
};
