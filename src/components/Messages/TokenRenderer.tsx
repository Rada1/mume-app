import React, { useMemo } from 'react';
import { Token, EntityToken, AnsiToken, TextToken } from '../../types';
import { useTokenHighlight, useBaseGame, useUI } from '../../context/GameContext';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useShallow } from 'zustand/react/shallow';
import { getInlineGlowColor } from '../../utils/inlineActionModel';
import { getInlineCategoryAxes } from '../../utils/inlineCategoryAxes';
import { extractMumeKeyword } from '../../utils/gameUtils';
import { classifyItemTier } from '../../utils/itemTier';
import { isObjectSelected } from '../../utils/selectionUtils';
import { Box, DoorOpen, UserRound } from 'lucide-react';
import { NpcEntityIcon } from './EntityTypeIcons';

import { MessageType } from '../../types';

interface TargetHighlightProps {
    className: string;
}

const TARGET_WORD_PATTERN = '[^a-zA-Z0-9\\u00C0-\\u00FF]';
const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildTargetMatcher = (target: string | null) => {
    const normalized = target?.trim().toLowerCase() || null;
    if (!normalized || normalized.length < 2) return null;
    return {
        value: normalized,
        regex: new RegExp(`(?:^|${TARGET_WORD_PATTERN})(${escapeRegex(normalized)})(?=${TARGET_WORD_PATTERN}|$)`, 'gi')
    };
};

const renderItemConditionText = (content: string, state?: string, stateLabel?: string): React.ReactNode => {
    if (!state || !stateLabel) return content;

    const stateText = `(${stateLabel})`;
    const index = content.toLowerCase().indexOf(stateText);
    if (index === -1) return content;

    const before = content.slice(0, index);
    const match = content.slice(index, index + stateText.length);
    const after = content.slice(index + stateText.length);

    return (
        <>
            {before}
            <span className={`inline-item-condition item-state-${state}`}>{match}</span>
            {after}
        </>
    );
};

export const getEntityTypeIcon = (categoryId?: string) => {
    if (!categoryId || categoryId === 'cat-room') return null;
    if (categoryId === 'cat-exit') return { kind: 'exit', label: 'Exit', icon: DoorOpen };
    if (['cat-npc', 'cat-enemy', 'cat-neutral'].includes(categoryId)) return { kind: 'npc', label: 'Entity', icon: NpcEntityIcon };
    if (['cat-ally', 'cat-ally-remote', 'cat-player', 'player'].includes(categoryId)) return { kind: 'ally', label: 'Ally', icon: UserRound };
    if (categoryId.includes('object') || categoryId.includes('item') || categoryId === 'cat-container-item') {
        return { kind: 'object', label: 'Object', icon: Box };
    }
    return null;
};

export interface TokenRendererProps {
    tokens?: Token[];
    fallbackHtml?: string;
    type?: MessageType;
    forceBoldEntities?: boolean;
    splitFirstWord?: boolean;
    wordReveal?: boolean;
    disableRoomInline?: boolean;
    isRoomContentsLine?: boolean;
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
    disableRoomInline = false,
    isRoomContentsLine = false,
    metadata: propMetadata
}) => {
    const { target, opponentId, opponentName } = useTokenHighlight();
    const settings = useSettingsStore(useShallow(s => ({
        playerColor: s.playerColor,
        enemyColor: s.enemyColor,
        neutralColor: s.neutralColor,
        npcColor: s.npcColor,
        objectColor: s.objectColor,
        roomColor: s.roomColor,
        theme: s.theme,
        isTextRevealEnabled: s.isTextRevealEnabled,
    })));
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
                            <span className="first-word-static"><span>{firstPart}</span></span>
                            {secondPart && settings.isTextRevealEnabled && (
                                <span className="remaining-reveal-animated"><span>{secondPart}</span></span>
                            )}
                            {secondPart && !settings.isTextRevealEnabled && <span>{secondPart}</span>}
                        </>
                    );
                } else {
                    return <span className="first-word-static"><span>{fallbackHtml}</span></span>;
                }
            }
        }
        if (disableRoomInline) {
            return <span className="room-title-text" dangerouslySetInnerHTML={{ __html: fallbackHtml }} />;
        }
        return <span dangerouslySetInnerHTML={{ __html: fallbackHtml }} />;
    }

    const targetMatcher = useMemo(() => buildTargetMatcher(target), [target]);
    const currentTarget = targetMatcher?.value || null;

    const propCategoryAxes = propMetadata?.category ? getInlineCategoryAxes(propMetadata.category) : null;
    
    const getTargetHighlightProps = (): TargetHighlightProps => ({
        className: 'is-target target-highlighter',
    });

    const renderTextWithTarget = (text: string, key: string | number) => {
        if (!targetMatcher || !text.toLowerCase().includes(targetMatcher.value)) {
            return <span key={key}>{text}</span>;
        }

        const parts = [];
        let lastIndex = 0;
        let match;
        const regex = targetMatcher.regex;
        regex.lastIndex = 0;

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
                    {...getTargetHighlightProps()}
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

    const renderToken = (token: Token, idx: number | string, textOverride?: string) => {
        const content = textOverride !== undefined ? textOverride : token.content;
        const tokenContentLower = content.toLowerCase();

        // 1. Determine if this token EXACTLY matches the target
        let isTargetMatch = !!currentTarget && (
            tokenContentLower === currentTarget ||
            (token.type === 'entity' && token.metadata?.context?.toLowerCase() === currentTarget) ||
            (token.type === 'entity' && token.metadata?.category !== 'cat-room' && tokenContentLower.includes(currentTarget))
        );

        if (token.type === 'entity') {
            const e = token as EntityToken;
            const isAuto = e.metadata?.extraClasses?.includes('auto-occupant');
            const extraClasses = [...(e.metadata?.extraClasses || [])];
            const defaultContext = e.metadata?.context || extractMumeKeyword(content);
            const tokenCategoryId = propMetadata?.category || e.metadata?.category;
            const categoryAxes = getInlineCategoryAxes(tokenCategoryId);
            const entityId = propMetadata?.id || e.entityId;
            const isSelectedEntity = !!entityId && isObjectSelected(selectedObjectIds || new Set(), entityId, tokenCategoryId);
            if (!categoryAxes.isTargetable) isTargetMatch = false;
            const isItemEntity = categoryAxes.isObject || tokenCategoryId === 'cat-container-item';
            const itemTier = isItemEntity ? classifyItemTier(content) : undefined;
            
            if (isSelectedEntity) {
                extraClasses.push('selected');
            } else if (isTargetMatch) {
                extraClasses.push('is-target');
                extraClasses.push('target-highlighter');
            }
            if (itemTier?.tier) {
                extraClasses.push(`inline-item-tier-${itemTier.tier}`);
            }

            const isNpc = categoryAxes.categoryId === 'cat-npc' ||
                tokenCategoryId === 'cat-npc' ||
                tokenCategoryId === 'npc' ||
                e.metadata?.kind === 'npc' ||
                Boolean(e.metadata?.isNpc);
            if (isNpc) {
                extraClasses.push('inline-btn-npc');
                extraClasses.push('npc-highlighter');
            }

            const isRoom = categoryAxes.family === 'room' || e.metadata?.kind === 'room';
            if (isRoom && disableRoomInline) {
                const roomTextStyle: React.CSSProperties = { ...(e.metadata?.style || {}) };
                if (e.metadata?.color && !roomTextStyle.color) roomTextStyle.color = e.metadata.color;
                return (
                    <span
                        key={idx}
                        style={Object.keys(roomTextStyle).length > 0 ? roomTextStyle : undefined}
                    >
                        {content}
                    </span>
                );
            }
            const props: any = {
                className: `${isRoom ? 'inline-btn room-name-inline' : `inline-btn`} ${extraClasses.join(' ')}`.trim(),
            };

            props['data-id'] = propMetadata?.id || e.entityId;
            props['data-cmd'] = propMetadata?.cmd || e.metadata?.cmd || propMetadata?.category || e.metadata?.category || (isAuto ? (e.metadata?.kind || content) : content);
            props['data-context'] = propMetadata?.context || defaultContext;
            props['data-category'] = tokenCategoryId;
            if (isNpc) {
                props['data-kind'] = 'npc';
            }
            props['data-targetable'] = categoryAxes.isTargetable ? 'true' : 'false';
            if (propMetadata?.action || e.metadata?.action || isRoom) props['data-action'] = propMetadata?.action || e.metadata?.action || 'menu';
            
            const parent = propMetadata?.parent || e.metadata?.parent;
            if (parent) {
                props['data-parent-noun'] = parent;
            }

            const selectedId = props['data-id'];
            if (selectedId) {
                if (popoverState?.entityId) {
                    const popoverSet = new Set<string>([popoverState.entityId]);
                    if (isObjectSelected(popoverSet, selectedId, props['data-category'])) {
                        props.className = `${props.className} menu-active`.trim();
                    }
                }
            }

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
            }

            const tokenWordIdx = typeof idx === 'number' ? idx : 0;
            style['--word-idx'] = tokenWordIdx;
            style['--word-idx-delay'] = `${(tokenWordIdx * 0.08).toFixed(2)}s`;

            if (forceBoldEntities || isRoom || categoryAxes.categoryId === 'cat-enemy') {
                style.fontWeight = 'bold';
            }

            const button = (
                <span 
                    {...props} 
                    style={Object.keys(style).length > 0 ? style : undefined}
                >
                    {renderItemConditionText(content, itemTier?.state, itemTier?.stateLabel)}
                </span>
            );

            return React.cloneElement(button, { key: idx });
        }

        switch (token.type) {
            case 'ansi':
                const a = token as AnsiToken;
                const ansiItemState = classifyItemTier(content);
                const ansiClasses = [
                    ...(a.classes || []),
                    ...(isTargetMatch && targetMatcher ? ['is-target', 'target-highlighter'] : [])
                ].filter(Boolean).join(' ');
                if (targetMatcher && !isTargetMatch) {
                    return (
                        <span key={idx} className={ansiClasses || undefined} style={a.style}>
                            {renderTextWithTarget(content, idx)}
                        </span>
                    );
                }
                const ansiWords = content.split(' ');
                if (ansiWords.length > 1) {
                    const baseWIdx = typeof idx === 'number' ? idx * 4 : 0;
                    return (
                        <React.Fragment key={idx}>
                            {ansiWords.map((w, wi) => {
                                if (!w) {
                                    if (wi === ansiWords.length - 1) return null;
                                    return <span key={`sp-${wi}`}> </span>;
                                }
                                return (
                                    <React.Fragment key={`w-${wi}`}>
                                        <span
                                            className={`log-text-word${ansiClasses ? ` ${ansiClasses}` : ''}`}
                                            style={{ ...a.style, '--word-idx': baseWIdx + wi } as any}
                                        >
                                            {w}
                                        </span>
                                        {wi < ansiWords.length - 1 ? ' ' : null}
                                    </React.Fragment>
                                );
                            })}
                        </React.Fragment>
                    );
                }
                return (
                    <span 
                        key={idx} 
                        className={`log-text-word${ansiClasses ? ` ${ansiClasses}` : ''}`}
                        style={{ ...a.style, '--word-idx': typeof idx === 'number' ? idx : 0 } as any}
                    >
                        {renderItemConditionText(content, ansiItemState.state, ansiItemState.stateLabel)}
                    </span>
                );
            
            case 'text':
            default:
                const textToken = token as TextToken;
                const textItemState = classifyItemTier(content);
                const textClasses = [
                    ...(textToken.classes || []),
                    ...(isTargetMatch && targetMatcher ? ['is-target', 'target-highlighter'] : [])
                ].filter(Boolean).join(' ');
                if (targetMatcher && !isTargetMatch) {
                    return (
                        <span key={idx} className={textClasses || undefined} style={textToken.style}>
                            {renderTextWithTarget(content, idx)}
                        </span>
                    );
                }
                const textWords = content.split(' ');
                if (textWords.length > 1) {
                    const baseWIdx = typeof idx === 'number' ? idx * 4 : 0;
                    return (
                        <React.Fragment key={idx}>
                            {textWords.map((w, wi) => {
                                if (!w) {
                                    if (wi === textWords.length - 1) return null;
                                    return <span key={`sp-${wi}`}> </span>;
                                }
                                return (
                                    <React.Fragment key={`w-${wi}`}>
                                        <span
                                            className={`log-text-word${textClasses ? ` ${textClasses}` : ''}`}
                                            style={{ ...textToken.style, '--word-idx': baseWIdx + wi } as any}
                                        >
                                            {w}
                                        </span>
                                        {wi < textWords.length - 1 ? ' ' : null}
                                    </React.Fragment>
                                );
                            })}
                        </React.Fragment>
                    );
                }
                return (
                    <span 
                        key={idx} 
                        className={`log-text-word${textClasses ? ` ${textClasses}` : ''}`}
                        style={{ ...textToken.style, '--word-idx': typeof idx === 'number' ? idx : 0 } as any}
                    >
                        {renderItemConditionText(content, textItemState.state, textItemState.stateLabel)}
                    </span>
                );
        }
    };

    if (propCategoryAxes?.family === 'room' && !disableRoomInline) {
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
                {remainingNodes.length > 0 && settings.isTextRevealEnabled && (
                    <span className="remaining-reveal-animated">{remainingNodes}</span>
                )}
                {remainingNodes.length > 0 && !settings.isTextRevealEnabled && remainingNodes}
            </>
        );
    }

    if (disableRoomInline) {
        return (
            <span className="room-title-text">
                {tokens.map((token, idx) => renderToken(token, idx))}
            </span>
        );
    }

    return (
        <>
            {tokens.map((token, idx) => renderToken(token, idx))}
        </>
    );
};
