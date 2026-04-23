import React from 'react';
import { Token, EntityToken, AnsiToken } from '../../types';
import { useVitals } from '../../context/GameContext';

export const TokenRenderer: React.FC<{ tokens?: Token[], fallbackHtml?: string }> = ({ tokens, fallbackHtml }) => {
    const { target } = useVitals();

    if (!tokens || tokens.length === 0) {
        if (!fallbackHtml) return null;
        return <span dangerouslySetInnerHTML={{ __html: fallbackHtml }} />;
    }

    const currentTarget = target?.toLowerCase() || null;

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
                                className="inline-btn is-target target-highlighter"
                                data-id={`reactive-target-${currentTarget}`}
                                data-ctx={currentTarget}
                                data-kind="target"
                                data-category="target"
                                data-location="none"
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
                    
                    if (isTargetMatch) {
                        extraClasses.push('is-target');
                        extraClasses.push('target-highlighter');
                    }

                    const props: any = {
                        className: `inline-btn ${extraClasses.join(' ')}`,
                        'data-id': e.entityId,
                        'data-cmd': isAuto ? (e.metadata?.kind || e.content) : e.content,
                        'data-context': e.metadata?.context || e.content,
                    };

                    if (e.metadata?.kind) props['data-kind'] = e.metadata.kind;
                    if (e.metadata?.location) props['data-location'] = e.metadata.location;
                    if (e.metadata?.category) props['data-category'] = e.metadata.category;
                    if (e.metadata?.action) props['data-action'] = e.metadata.action;

                    const style: React.CSSProperties = {};
                    if (e.metadata?.color) {
                        style['--glow-color'] = e.metadata.color;
                        style.color = 'var(--glow-color)';
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
                                className={isTargetMatch ? 'inline-btn is-target target-highlighter' : undefined}
                                data-id={isTargetMatch ? `ansi-target-${currentTarget}` : undefined}
                                data-ctx={isTargetMatch ? currentTarget : undefined}
                                data-kind={isTargetMatch ? 'target' : undefined}
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
                                className={isTargetMatch ? 'inline-btn is-target target-highlighter' : undefined}
                                data-id={isTargetMatch ? `text-target-${currentTarget}` : undefined}
                                data-ctx={isTargetMatch ? currentTarget : undefined}
                                data-kind={isTargetMatch ? 'target' : undefined}
                            >
                                {token.content}
                            </span>
                        );
                }
            })}
        </>
    );
};
