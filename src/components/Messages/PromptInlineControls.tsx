/**
 * @file PromptInlineControls.tsx
 * @description Turns compact MUME prompt mode codes into nearby interactive controls.
 */

import React from 'react';
import { PromptModeIndicators } from './PromptModeIndicators';

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

export const PromptInlineControls: React.FC<{ text: string }> = ({ text }) => {
    const { before, after } = splitPromptText(text);
    return (
        <span className="prompt-inline-controls">
            {before && <span className="prompt-inline-remainder">{before}</span>}
            <PromptModeIndicators compact />
            {after && <span className="prompt-inline-remainder">{after}</span>}
        </span>
    );
};
