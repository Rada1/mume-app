/**
 * @file PromptInlineControls.tsx
 * @description Turns compact MUME prompt mode codes into nearby interactive controls.
 */

import React from 'react';
import { PromptModeIndicators } from './PromptModeIndicators';
import { getPromptVitalValueRanges } from '../../utils/promptVitalText';

const MODE_CODE_PATTERN = /\b(?:A|M|P|S)\d+\b/i;
const MODE_TOKEN_PATTERN = /\b(?:[CSWHR]{1,5}|[AMPS]\d+)\b/gi;

export const hasInlinePromptModes = (value: string): boolean =>
    /\bP\d+\b/i.test(value) && MODE_CODE_PATTERN.test(value);

const splitPromptText = (value: string): { before: string; after: string } => {
    const cleanText = value
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/<\/?prompt\b[^>]*>/gi, '')
    .trim();
    const matches = [...cleanText.matchAll(MODE_TOKEN_PATTERN)];
    const first = matches[0];
    const last = matches[matches.length - 1];
    if (!first || first.index === undefined || last?.index === undefined) {
        return { before: cleanText, after: '' };
    }
    return {
        before: cleanText.slice(0, first.index),
        after: cleanText.slice(last.index + last[0].length),
    };
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

export const PromptInlineControls: React.FC<{ text: string }> = ({ text }) => {
    const { before, after } = splitPromptText(text);
    return (
        <span className="prompt-inline-controls">
            {before && <span className="prompt-inline-remainder">{renderPromptVitalsText(before)}</span>}
            <PromptModeIndicators compact />
            {after && <span className="prompt-inline-remainder">{renderPromptVitalsText(after)}</span>}
        </span>
    );
};
