import React from 'react';
import { Token, EntityToken, AnsiToken } from '../../types';
import { useVitals, useBaseGame, useUI } from '../../context/GameContext';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { getInlineGlowColor } from '../../utils/inlineActionModel';
import { getInlineCategoryAxes } from '../../utils/inlineCategoryAxes';
import { extractMumeKeyword } from '../../utils/gameUtils';
import { isObjectSelected } from '../../utils/selectionUtils';

import { MessageType } from '../../types';

interface InlineTargetProps {
    className: string;
    'data-id': string;
    'data-cmd': string;
    'data-context': string;
    'data-category': string;
    'data-action': string;
    'data-targetable'?: string;
}

export interface TokenRendererProps {
    tokens?: Token[];
    fallbackHtml?: string;
    type?: MessageType;
    forceBoldEntities?: boolean;
    metadata?: {
        id?: string;
        context?: string;
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
    const { inlineCategories, selectedObjectIds } = useBaseGame();
    const { popoverState } = useUI();

    if (!tokens || tokens.length === 0) {
        if (!fallbackHtml) return null;
        return <span dangerouslySetInnerHTML={{ __html: fallbackHtml }} />;
    }

    const currentTarget = target?.toLowerCase() || null;

    const propCategoryAxes = propMetadata?.category ? getInlineCategoryAxes(propMetadata.category) : null;
    if (propCategoryAxes?.family === 'room') {
        const context = propMetadata?.context || tokens.map(token => token.content).join('').trim();
        const categoryColor = getInlineGlowColor(propCategoryAxes.categoryId, inlineCategories, {
            room: settings.roomColor || undefined,
        }, settings.theme) || settings.roomColor || undefined;
        const wrapperProps: any = {
            className: 'inline-btn room-name-inline',
            'data-id': propMetadata?.id || `room:${context.toLowerCase()}`,
            'data-cmd': propMetadata?.cmd || propCategoryAxes.categoryId,
            'data-context': context,
            'data-category': propCategoryAxes.categoryId,
            'data-action': propMetadata?.action || 'menu',
            'data-targetable': 'false',
            style: {
                '--glow-color': categoryColor,
                color: categoryColor ? 'var(--glow-color)' : undefined,
                fontWeight: 'bold',
            } as React.CSSProperties,
        };

        return (
            <span {...wrapperProps}>
                {tokens.map((token, idx) => {
                    if (token.type === 'ansi') {
                        const a = token as AnsiToken;
                        return <span key={idx} style={a.style}>{a.content}</span>;
                    }
                    return <span key={idx}>{token.content}</span>;
                })}
            </span>
        );
    }

    const getInlineTargetProps = (id: string, context: string): InlineTargetProps => ({
        className: 'inline-btn is-target target-highlighter',
        'data-id': id,
        'data-cmd': 'target',
        'data-context': context,
        'data-category': 'target',
        'data-action': 'menu'
    });

    return (
        <>
            {tokens.map((token, idx) => {
                const tokenContentLower = token.content.toLowerCase();
                
                // 1. Determine if this token EXACTLY matches the target
                let isTargetMatch = !!currentTarget && (
                    tokenContentLower === currentTarget || 
                    (token.type === 'entity' && token.metadata?.context?.toLowerCase() === currentTarget) ||
                    (token.type === 'entity' && token.metadata?.category !== 'cat-room' && tokenContentLower.includes(currentTarget))
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
                    const defaultContext = e.metadata?.context || extractMumeKeyword(e.content);
                    const tokenCategoryId = propMetadata?.category || e.metadata?.category;
                    const categoryAxes = getInlineCategoryAxes(tokenCategoryId);
                    if (!categoryAxes.isTargetable) isTargetMatch = false;
                    
                    if (isTargetMatch) {
                        extraClasses.push('is-target');
                        extraClasses.push('target-highlighter');
                    }

                    const isRoom = categoryAxes.family === 'room' || e.metadata?.kind === 'room';
                    const props: any = {
                        className: `${isRoom ? 'inline-btn room-name-inline' : `inline-btn`} ${extraClasses.join(' ')}`.trim(),
                    };

                    if (isTargetMatch && currentTarget) {
                        Object.assign(props, getInlineTargetProps(propMetadata?.id || e.entityId || `entity-target-${currentTarget}`, currentTarget));
                    } else {
                        props['data-id'] = propMetadata?.id || e.entityId;
                        props['data-cmd'] = propMetadata?.cmd || propMetadata?.category || e.metadata?.category || (isAuto ? (e.metadata?.kind || e.content) : e.content);
                        props['data-context'] = propMetadata?.context || defaultContext;
                        props['data-category'] = tokenCategoryId;
                        props['data-targetable'] = categoryAxes.isTargetable ? 'true' : 'false';
                        if (propMetadata?.action || e.metadata?.action || isRoom) props['data-action'] = propMetadata?.action || e.metadata?.action || 'menu';
                    }

                    const selectedId = props['data-id'];
                    const activeSet = new Set(selectedObjectIds || []);
                    if (popoverState?.entityId) activeSet.add(popoverState.entityId);
                    if (selectedId && isObjectSelected(activeSet, selectedId, props['data-category'])) {
                        props.className = `${props.className} menu-active`.trim();
                    }

                    // Resolve display color: explicit glowColor (e.g. who-list) > getInlineGlowColor (override → user setting → category default) > token ANSI color
                    let style: React.CSSProperties = { ...(e.metadata?.style || {}) };

                    const categoryColor: string | null = e.metadata?.glowColor ||
                        getInlineGlowColor(tokenCategoryId, inlineCategories, {
                            player:  settings.playerColor  || undefined,
                            all:     settings.playerColor  || undefined,
                            enemy:   settings.enemyColor   || undefined,
                            neutral: settings.neutralColor || undefined,
                            npc:     settings.npcColor     || undefined,
                            object:  settings.objectColor  || undefined,
                            room:    settings.roomColor    || undefined,
                        }, settings.theme) || e.metadata?.color || null;
                    
                    if (categoryColor) {
                        style['--glow-color'] = categoryColor;
                        style.color = 'var(--glow-color)';
                    }

                    if (forceBoldEntities || isRoom || categoryAxes.categoryId === 'cat-enemy') {
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
