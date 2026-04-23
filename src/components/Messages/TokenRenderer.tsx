import React from 'react';
import { Token, EntityToken, AnsiToken } from '../../types';

export const TokenRenderer: React.FC<{ tokens?: Token[], fallbackHtml?: string }> = ({ tokens, fallbackHtml }) => {
    if (!tokens || tokens.length === 0) {
        if (!fallbackHtml) return null;
        return <span dangerouslySetInnerHTML={{ __html: fallbackHtml }} />;
    }

    return (
        <>
            {tokens.map((token, idx) => {
                if (token.type === 'entity') {
                    const e = token as EntityToken;
                    const props: any = {
                        className: `inline-btn ${e.metadata?.extraClasses?.join(' ') || ''}`,
                        'data-id': e.entityId,
                        'data-cmd': e.content,
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

                    return <span key={idx} {...props} style={Object.keys(style).length > 0 ? style : undefined}>{e.content}</span>;
                }

                if (token.type === 'ansi') {
                    const a = token as AnsiToken;
                    return <span key={idx} style={a.style}>{a.content}</span>;
                }

                return <span key={idx}>{token.content}</span>;
            })}
        </>
    );
};
