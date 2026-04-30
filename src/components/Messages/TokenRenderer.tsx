import React from 'react';
import { Token, EntityToken, AnsiToken } from '../../types';
import { useVitals } from '../../context/GameContext';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { COLOR_PLAYER, COLOR_NPC, COLOR_OBJ, COLOR_ROOM, COLOR_ENEMY } from '../../utils/categorizationUtils';
import { extractMumeKeyword } from '../../utils/gameUtils';

import { MessageType } from '../../types';

interface InlineTargetProps {
    className: string;
    'data-id': string;
    'data-cmd': string;
    'data-context': string;
    'data-kind': string;
    'data-category': string;
    'data-location': string;
    'data-action': string;
}

export interface TokenRendererProps {
    tokens?: Token[];
    fallbackHtml?: string;
    type?: MessageType;
    forceBoldEntities?: boolean;
    metadata?: {
        id?: string;
        context?: string;
        kind?: string;
        location?: string;
        category?: string;
        cmd?: string;
        action?: string;
    };
}

export const TokenRenderer: React.FC<TokenRendererProps> = ({ 
    tokens, 
    fallbackHtml,
    type,
    forceBoldEntities = false,
    metadata: propMetadata
}) => {
    const { target } = useVitals();
    const settings = useSettingsStore();

    if (!tokens || tokens.length === 0) {
        if (!fallbackHtml) return null;
        return <span dangerouslySetInnerHTML={{ __html: fallbackHtml }} />;
    }

    const currentTarget = target?.toLowerCase() || null;

    const getInlineTargetProps = (id: string, context: string): InlineTargetProps => ({
        className: 'inline-btn is-target target-highlighter',
        'data-id': id,
        'data-cmd': 'target',
        'data-context': context,
        'data-kind': 'target',
        'data-category': 'target',
        'data-location': 'none',
        'data-action': 'menu'
    });

    return (
        <>
            {tokens.map((token, idx) => {
                const tokenContentLower = token.content.toLowerCase();
                
                // 1. Determine if this token EXACTLY matches the target
                const isTargetMatch = !!currentTarget && (
                    tokenContentLower === currentTarget || 
                    (token.type === 'entity' && token.metadata?.context?.toLowerCase() === currentTarget) ||
                    (token.type === 'entity' && token.metadata?.kind !== 'none' && tokenContentLower.includes(currentTarget))
                );

                // Helper to render text with target highlighting
                const renderTextWithTarget = (text: string, key: string | number) => {
                    if (!currentTarget || !text.toLowerCase().includes(currentTarget)) {
                        return <span key={key}>{text}</span>;
                    }

                    // Use word boundaries for target matching to avoid over-highlighting
                    const escapedTarget = currentTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const parts = [];
                    let lastIndex = 0;
                    let match;

                    // Safe word boundary matching without lookbehind
                    const pattern = `(?:^|[^a-zA-Z0-9\\u00C0-\\u00FF])(${escapedTarget})(?=[^a-zA-Z0-9\\u00C0-\\u00FF]|$)`;
                    const regex = new RegExp(pattern, 'gi');

                    while ((match = regex.exec(text)) !== null) {
                        let matchContent = match[0];
                        let matchIndex = match.index;
                        let targetMatch = match[1];

                        // If match includes a boundary character at the start, skip it
                        if (matchContent.length > targetMatch.length) {
                            matchIndex += 1;
                        }

                        // Add the text before the match
                        if (matchIndex > lastIndex) {
                            parts.push(text.substring(lastIndex, matchIndex));
                        }
                        
                        parts.push(
                            <span 
                                key={`target-${matchIndex}`} 
                                {...getInlineTargetProps(`reactive-target-${currentTarget}`, currentTarget)}
                            >
                                {targetMatch}
                            </span>
                        );
                        lastIndex = matchIndex + targetMatch.length;
                        // Avoid infinite loops if match is empty
                        if (regex.lastIndex === match.index) regex.lastIndex++;
                    }

                    if (lastIndex < text.length) {
                        parts.push(text.substring(lastIndex));
                    }

                    return <span key={key}>{parts}</span>;
                };

                if (token.type === 'entity') {
                    const e = token as EntityToken;
                    const isAuto = e.metadata?.extraClasses?.includes('auto-occupant');
                    const extraClasses = [...(e.metadata?.extraClasses || [])];
                    const defaultContext = extractMumeKeyword(e.metadata?.context || e.content);
                    
                    if (isTargetMatch) {
                        extraClasses.push('is-target');
                        extraClasses.push('target-highlighter');
                    }

                    const isRoom = e.metadata?.kind === 'room';
                    const props: any = {
                        className: `inline-btn ${isRoom ? 'room-name-static' : ''} ${extraClasses.join(' ')}`.trim(),
                    };

                    if (isTargetMatch && currentTarget) {
                        Object.assign(props, getInlineTargetProps(propMetadata?.id || e.entityId || `entity-target-${currentTarget}`, currentTarget));
                    } else {
                        props['data-id'] = propMetadata?.id || e.entityId;
                        props['data-cmd'] = propMetadata?.cmd || propMetadata?.category || e.metadata?.category || (isAuto ? (e.metadata?.kind || e.content) : e.content);
                        props['data-context'] = propMetadata?.context || defaultContext;
                        if (propMetadata?.kind || e.metadata?.kind) props['data-kind'] = propMetadata?.kind || e.metadata?.kind;
                        if (propMetadata?.location || e.metadata?.location) props['data-location'] = propMetadata?.location || e.metadata?.location;
                        props['data-category'] = propMetadata?.category || e.metadata?.category || (isRoom ? 'room' : undefined);
                        if (propMetadata?.action || e.metadata?.action) props['data-action'] = propMetadata?.action || e.metadata?.action;
                    }

                    // Apply category colors from settings - PRIORITY: Kind (Category) Master > Trait
                    let style: React.CSSProperties = { ...(e.metadata?.style || {}) };
                    const kind = propMetadata?.kind || e.metadata?.kind;
                    
                    let categoryColor = null;
                    if (kind === 'player') categoryColor = settings.playerColor || COLOR_PLAYER;
                    else if (kind === 'enemy') categoryColor = settings.enemyColor || COLOR_ENEMY;
                    else if (kind === 'npc') categoryColor = settings.npcColor || COLOR_NPC;
                    else if (kind === 'object') categoryColor = settings.objectColor || COLOR_OBJ;
                    else if (kind === 'room') categoryColor = settings.roomColor || COLOR_ROOM;

                    // Only use metadata-provided colors (Traits) if the Kind itself doesn't have a color
                    if (!categoryColor) {
                        categoryColor = e.metadata?.glowColor || e.metadata?.color;
                    }
                    
                    if (categoryColor) {
                        style['--glow-color'] = categoryColor;
                        style.color = 'var(--glow-color)';
                    }

                    if (forceBoldEntities || isRoom || kind === 'enemy') {
                        style.fontWeight = 'bold';
                    }

                    return (
                        <span 
                            key={idx} 
                            {...props} 
                            style={Object.keys(style).length > 0 ? style : undefined}
                        >
                            {e.content}
                        </span>
                    );
                }

                switch (token.type) {
                    case 'ansi':
                        const a = token as AnsiToken;
                        return (
                            <span 
                                key={idx} 
                                style={a.style}
                                {...(isTargetMatch && currentTarget ? getInlineTargetProps(`ansi-target-${currentTarget}`, currentTarget) : {})}
                            >
                                {currentTarget && !isTargetMatch ? renderTextWithTarget(a.content, idx) : a.content}
                            </span>
                        );
                    
                    case 'text':
                    default:
                        if (currentTarget && !isTargetMatch) {
                            return renderTextWithTarget(token.content, idx);
                        }
                        return (
                            <span 
                                key={idx} 
                                {...(isTargetMatch && currentTarget ? getInlineTargetProps(`text-target-${currentTarget}`, currentTarget) : {})}
                            >
                                {token.content}
                            </span>
                        );
                }
            })}
        </>
    );
};
