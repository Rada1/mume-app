import React from 'react';

export type TokenType = 'text' | 'entity' | 'ansi' | 'url';

export interface BaseToken {
    type: TokenType;
    content: string;
}

export interface TextToken extends BaseToken {
    type: 'text';
}

export interface AnsiToken extends BaseToken {
    type: 'ansi';
    style?: React.CSSProperties;
    classes?: string[];
}

export interface EntityToken extends BaseToken {
    type: 'entity';
    entityId: string;
    metadata?: {
        kind?: string;
        location?: string;
        category?: string;
        context?: string;
        color?: string;
        action?: string;
        menuDisplay?: string;
        extraClasses?: string[];
        style?: React.CSSProperties;
        glowColor?: string;
        occupantId?: string | number;
        targetIndex?: number;
    };
}

export interface UrlToken extends BaseToken {
    type: 'url';
    href: string;
}

export type Token = TextToken | AnsiToken | EntityToken | UrlToken;
