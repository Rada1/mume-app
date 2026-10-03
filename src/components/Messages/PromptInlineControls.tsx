/**
 * @file PromptInlineControls.tsx
 * @description Turns compact MUME prompt mode codes into nearby interactive controls.
 */

import React from 'react';
import { PromptModeIndicators } from './PromptModeIndicators';
import { getPromptVitalValueRanges } from '../../utils/promptVitalText';
import type { Token } from '../../types';
import { TokenRenderer } from './TokenRenderer';

const MODE_CODE_PATTERN = /\b(?:A|M|P|S)\d+\b/i;
const MODE_TOKEN_PATTERN = /\b(?:[CSWHR]{1,5}|[AMPS]\d+)\b/gi;

export const hasInlinePromptModes = (value: string): boolean =>
    /\bP\d+\b/i.test(value) && MODE_CODE_PATTERN.test(value);

interface PromptTextSplit {
    before: string;
    after: string;
    beforeStart: number;
    beforeEnd: number;
    afterStart: number;
    afterEnd: number;
}

const splitPromptText = (value: string): PromptTextSplit => {
    const untrimmedText = value
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/<\/?prompt\b[^>]*>/gi, '');
    const leadingWhitespace = untrimmedText.length - untrimmedText.trimStart().length;
    const cleanText = untrimmedText.trim();
    const matches = [...cleanText.matchAll(MODE_TOKEN_PATTERN)];
    const first = matches[0];
    const last = matches[matches.length - 1];
    if (!first || first.index === undefined || last?.index === undefined) {
        return {
            before: cleanText,
            after: '',
            beforeStart: leadingWhitespace,
            beforeEnd: leadingWhitespace + cleanText.length,
            afterStart: leadingWhitespace + cleanText.length,
            afterEnd: leadingWhitespace + cleanText.length,
        };
    }
    const beforeEnd = leadingWhitespace + first.index;
    const afterStart = leadingWhitespace + last.index + last[0].length;
    const afterEnd = leadingWhitespace + cleanText.length;
    return {
        before: cleanText.slice(0, first.index),
        after: cleanText.slice(last.index + last[0].length),
        beforeStart: leadingWhitespace,
        beforeEnd,
        afterStart,
        afterEnd,
    };
};

const sliceTokens = (tokens: Token[], start: number, end: number): Token[] => {
    let offset = 0;
    const result: Token[] = [];
    tokens.forEach(token => {
        const tokenStart = offset;
        const tokenEnd = tokenStart + token.content.length;
        offset = tokenEnd;
        const sliceStart = Math.max(start, tokenStart);
        const sliceEnd = Math.min(end, tokenEnd);
        if (sliceStart >= sliceEnd) return;

        const content = token.content.slice(sliceStart - tokenStart, sliceEnd - tokenStart);
        if (token.type === 'entity' && content !== token.content) {
            result.push({ type: 'text', content });
        } else {
            result.push({ ...token, content });
        }
    });
    return result;
};

const renderPromptVitalsText = (text: string): React.ReactNode => {
    const ranges = getPromptVitalValueRanges(text);
    if (ranges.length === 0) return text;

    const parts: React.ReactNode[] = [];
    let cursor = 0;
    ranges.forEach((range, index) => {
        if (range.start > cursor) parts.push(text.slice(cursor, range.start));
        parts.push(
            <span
                key={`vital-${index}`}
                className="prompt-vital-value"
                data-vital-percent={range.percent === undefined ? undefined : ''}
                data-vital-type={range.vitalType}
                style={range.percent === undefined ? undefined : { '--prompt-vital-percent': `${range.percent}%` } as React.CSSProperties}
            >
                {text.slice(range.start, range.end)}
            </span>
        );
        cursor = range.end;
    });
    if (cursor < text.length) parts.push(text.slice(cursor));
    return <>{parts}</>;
};

export const PromptInlineControls: React.FC<{ text: string; tokens?: Token[] }> = ({ text, tokens }) => {
    const sourceText = tokens?.length ? tokens.map(token => token.content).join('') : text;
    const { before, after, beforeStart, beforeEnd, afterStart, afterEnd } = splitPromptText(sourceText);
    const beforeTokens = tokens?.length ? sliceTokens(tokens, beforeStart, beforeEnd) : undefined;
    const afterTokens = tokens?.length ? sliceTokens(tokens, afterStart, afterEnd) : undefined;
    const renderSegment = (segmentText: string, segmentTokens?: Token[]) =>
        segmentTokens?.length
            ? <TokenRenderer tokens={segmentTokens} highlightPromptVitals />
            : renderPromptVitalsText(segmentText);

    return (
        <span className="prompt-inline-controls">
            {before && <span className="prompt-inline-remainder">{renderSegment(before, beforeTokens)}</span>}
            <PromptModeIndicators compact />
            {after && <span className="prompt-inline-remainder">{renderSegment(after, afterTokens)}</span>}
        </span>
    );
};
