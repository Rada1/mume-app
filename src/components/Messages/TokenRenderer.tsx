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
    splitFirstWord?: boolean;
    wordReveal?: boolean;
    metadata?: {
        id?: string;
        context?: string;
        category?: string;
        cmd?: string;
        action?: string;
        parent?: string;
    };
}

export const TokenRenderer: React.FC<TokenRendererProps> = ({
    tokens,
    fallbackHtml,
    type,
    forceBoldEntities = false,
    splitFirstWord = false,
    wordReveal = false,
    metadata: propMetadata
}) => {
    const { target, opponentId, opponentName } = useVitals();
    const settings = useSettingsStore();
    const { inlineCategories, selectedObjectIds, inCombat } = useBaseGame();
    const { popoverState } = useUI();

    if (!tokens || tokens.length === 0) {
        if (!fallbackHtml) return null;
        if (splitFirstWord) {
            if (fallbackHtml.includes('<')) {
                return <span className="first-word-static" dangerouslySetInnerHTML={{ __html: fallbackHtml }} />;
            } else {
                const match = fallbackHtml.match(/\s/);
                if (match && match.index !== undefined) {
                    const firstPart = fallbackHtml.substring(0, match.index);
                    const secondPart = fallbackHtml.substring(match.index);
                    return (
                        <>
                            <span className="first-word-static">{firstPart}</span>
                            {secondPart && (
                                <span className="remaining-reveal-animated">{secondPart}</span>
                            )}
                        </>
                    );
                } else {
                    return <span className="first-word-static">{fallbackHtml}</span>;
                }
            }
        }
        return <span dangerouslySetInnerHTML={{ __html: fallbackHtml }} />;
    }

    const currentTarget = target?.toLowerCase() || null;

    const propCategoryAxes = propMetadata?.category ? getInlineCategoryAxes(propMetadata.category) : null;
    
    const getInlineTargetProps = (id: string, context: string): InlineTargetProps => ({
        className: 'inline-btn is-target target-highlighter',
        'data-id': id,
        'data-cmd': 'target',
        'data-context': context,
        'data-category': 'target',
        'data-action': 'menu'
    });

    const renderToken = (token: Token, idx: number | string, textOverride?: string) => {
        const content = textOverride !== undefined ? textOverride : token.content;
        const tokenContentLower = content.toLowerCase();
        
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
            const defaultContext = e.metadata?.context || extractMumeKeyword(content);
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
                // Preserve entity identity/color; only override the action so tapping fires 'target'
                props['data-cmd'] = 'target';
                props['data-action'] = 'menu';
                props['data-context'] = propMetadata?.context || defaultContext;
            } else {
                props['data-id'] = propMetadata?.id || e.entityId;
                props['data-cmd'] = propMetadata?.cmd || e.metadata?.cmd || propMetadata?.category || e.metadata?.category || (isAuto ? (e.metadata?.kind || content) : content);
                props['data-context'] = propMetadata?.context || defaultContext;
                props['data-category'] = tokenCategoryId;
                props['data-targetable'] = categoryAxes.isTargetable ? 'true' : 'false';
                if (propMetadata?.action || e.metadata?.action || isRoom) props['data-action'] = propMetadata?.action || e.metadata?.action || 'menu';
                
                const parent = propMetadata?.parent || e.metadata?.parent;
                if (parent) {
                    props['data-parent-noun'] = parent;
                }
            }

            const selectedId = props['data-id'];
            if (selectedId) {
                const isSel = isObjectSelected(selectedObjectIds || new Set(), selectedId, props['data-category']);
                if (isSel) {
                    props.className = `${props.className} selected`.trim();
                }
                if (popoverState?.entityId) {
                    const popoverSet = new Set<string>([popoverState.entityId]);
                    if (isObjectSelected(popoverSet, selectedId, props['data-category'])) {
                        props.className = `${props.className} menu-active`.trim();
                    }
                }
            }

            const entityId = propMetadata?.id || e.entityId;
            let isOpponentMatch = false;
            if (inCombat) {
                if (opponentId && entityId && String(opponentId) === String(entityId)) {
                    isOpponentMatch = true;
                } else if (opponentName) {
                    const normOpponent = opponentName.replace(/^[*-]+|[*-]+$/g, '').replace(/^(a|an|the)\s+/i, '').trim().toLowerCase();
                    const entityName = (e.metadata?.context || content || '').toLowerCase();
                    const normEntity = entityName.replace(/^[*-]+|[*-]+$/g, '').replace(/^(a|an|the)\s+/i, '').trim().toLowerCase();
                    if (normOpponent && normEntity && (normOpponent === normEntity || normOpponent.includes(normEntity) || normEntity.includes(normOpponent))) {
                        isOpponentMatch = true;
                    }
                }
            }

            if (isOpponentMatch) {
                props.className = `${props.className} is-opponent`.trim();
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
                    {content}
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
                        {currentTarget && !isTargetMatch ? renderTextWithTarget(content, idx) : content}
                    </span>
                );
            
            case 'text':
            default:
                if (currentTarget && !isTargetMatch) {
                    return renderTextWithTarget(content, idx);
                }
                return (
                    <span 
                        key={idx} 
                        {...(isTargetMatch && currentTarget ? getInlineTargetProps(`text-target-${currentTarget}`, currentTarget) : {})}
                    >
                        {content}
                    </span>
                );
        }
    };

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

    if (wordReveal) {
        let wordIdx = 0;
        const wordNodes: React.ReactNode[] = [];

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];

            if (token.type === 'entity') {
                wordNodes.push(
                    <span key={`lw-${i}`} className="log-word" style={{ animationDelay: `${wordIdx * 30}ms` }}>
                        {renderToken(token, i)}
                    </span>
                );
                wordIdx++;
                continue;
            }

            const ansiStyle = token.type === 'ansi' ? (token as AnsiToken).style : undefined;
            const words = token.content.split(' ');

            for (let j = 0; j < words.length; j++) {
                const word = words[j];
                if (!word) {
                    // Skip trailing empty word — the previous word's trailing space already
                    // represents that whitespace; emitting another <span> would double it.
                    if (j === words.length - 1) continue;
                    wordNodes.push(<span key={`sp-${i}-${j}`} style={ansiStyle}> </span>);
                    continue;
                }
                wordNodes.push(
                    <span
                        key={`lw-${i}-${j}`}
                        className="log-word"
                        style={{ ...ansiStyle, animationDelay: `${wordIdx * 30}ms` }}
                    >
                        {word}{j < words.length - 1 ? ' ' : ''}
                    </span>
                );
                wordIdx++;
            }
        }

        return <>{wordNodes}</>;
    }

    if (splitFirstWord) {
        let firstWordTokenFound = false;
        const firstWordNodes: React.ReactNode[] = [];
        const remainingNodes: React.ReactNode[] = [];

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            
            if (firstWordTokenFound) {
                remainingNodes.push(renderToken(token, i));
                continue;
            }

            const content = token.content;
            if (!content) {
                continue;
            }

            const match = content.match(/\s/);
            if (match && match.index !== undefined) {
                const firstPart = content.substring(0, match.index);
                const secondPart = content.substring(match.index);

                if (firstPart.trim().length > 0) {
                    firstWordNodes.push(renderToken(token, i, firstPart));
                    firstWordTokenFound = true;
                    if (secondPart) {
                        remainingNodes.push(renderToken(token, `remaining-${i}`, secondPart));
                    }
                } else {
                    const nonWsMatch = content.match(/\S/);
                    if (nonWsMatch && nonWsMatch.index !== undefined) {
                        const nextWsMatch = content.substring(nonWsMatch.index).match(/\s/);
                        if (nextWsMatch && nextWsMatch.index !== undefined) {
                            const actualSpaceIdx = nonWsMatch.index + nextWsMatch.index;
                            const firstPart = content.substring(0, actualSpaceIdx);
                            const secondPart = content.substring(actualSpaceIdx);

                            firstWordNodes.push(renderToken(token, i, firstPart));
                            firstWordTokenFound = true;
                            if (secondPart) {
                                remainingNodes.push(renderToken(token, `remaining-${i}`, secondPart));
                            }
                        } else {
                            firstWordNodes.push(renderToken(token, i));
                            firstWordTokenFound = true;
                        }
                    } else {
                        firstWordNodes.push(renderToken(token, i));
                    }
                }
            } else {
                if (content.trim().length > 0) {
                    firstWordNodes.push(renderToken(token, i));
                    firstWordTokenFound = true;
                } else {
                    firstWordNodes.push(renderToken(token, i));
                }
            }
        }

        return (
            <>
                <span className="first-word-static">{firstWordNodes}</span>
                {remainingNodes.length > 0 && (
                    <span className="remaining-reveal-animated">{remainingNodes}</span>
                )}
            </>
        );
    }

    return (
        <>
            {tokens.map((token, idx) => renderToken(token, idx))}
        </>
    );
};
