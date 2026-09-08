/**
 * @file ansi.test.ts
 * @description Unit tests for ANSI sequence normalization and 256-color HTML rendering.
 */

import { describe, it, expect } from 'vitest';
import { ansiConvert, normalizeAnsiSequences } from './ansi';
import { Tokenizer } from '../services/parser/Tokenizer';

describe('ANSI Normalization', () => {
    it('decomposes compound 256-color foreground and background ANSI sequences', () => {
        const input = '\x1b[38;5;128;40m&304\x1b[0m';
        const expected = '\x1b[38;5;128m\x1b[40m&304\x1b[0m';
        expect(normalizeAnsiSequences(input)).toBe(expected);
    });

    it('decomposes compound 256-color foreground and high-intensity background sequences', () => {
        const input = '\x1b[38;5;16;107m&000\x1b[0m';
        const expected = '\x1b[38;5;16m\x1b[107m&000\x1b[0m';
        expect(normalizeAnsiSequences(input)).toBe(expected);
    });

    it('leaves standard discrete sequences unchanged', () => {
        const input = '\x1b[1m\x1b[31mBold Red\x1b[0m';
        expect(normalizeAnsiSequences(input)).toBe(input);
    });
});

describe('256-Color HTML Conversion', () => {
    it('renders 256-color foreground and background styles without blink tags', () => {
        const html = ansiConvert.toHtml('\x1b[38;5;128;40m&304\x1b[0m');
        expect(html).toContain('color:rgb(175,0,215)');
        expect(html).toContain('background-color:var(--ansi-black)');
        expect(html).not.toContain('<blink>');
    });

    it('renders high-intensity white background with dark foreground color', () => {
        const html = ansiConvert.toHtml('\x1b[38;5;16;107m&000\x1b[0m');
        expect(html).toContain('color:rgb(0,0,0)');
        expect(html).toContain('background-color:var(--ansi-bright-white)');
        expect(html).not.toContain('<blink>');
    });

    it('renders grayscale ramp values correctly', () => {
        const htmlDark = ansiConvert.toHtml('\x1b[38;5;232;107m&grey3\x1b[0m');
        expect(htmlDark).toContain('color:rgb(8,8,8)');
        expect(htmlDark).toContain('background-color:var(--ansi-bright-white)');

        const htmlLight = ansiConvert.toHtml('\x1b[38;5;255;40m&grey93\x1b[0m');
        expect(htmlLight).toContain('color:rgb(238,238,238)');
        expect(htmlLight).toContain('background-color:var(--ansi-black)');
    });
});

describe('Tokenizer ANSI Background Handling', () => {
    it('populates both color and backgroundColor on tokens from compound sequences', () => {
        const tokenizer = Tokenizer.getInstance();
        tokenizer.reset();
        const tokens = tokenizer.tokenize('\x1b[38;5;128;40m&304\x1b[0m', {});
        const ansiToken = tokens.find(t => t.type === 'ansi');
        expect(ansiToken).toBeDefined();
        expect(ansiToken?.style?.color).toBe('rgb(175,0,215)');
        expect(ansiToken?.style?.backgroundColor).toBe('var(--ansi-black)');
    });
});
