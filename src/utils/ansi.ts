/**
 * @file ansi.ts
 * @description ANSI escape code to HTML converter and 256-color palette manager.
 */

import Convert from 'ansi-to-html';

// --- Palette Section ---
const generatePalette = () => {
    const names = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
    const palette: string[] = new Array(256).fill('');

    // Standard 16 colors (using CSS variables for theme support)
    for (let i = 0; i < 8; i++) {
        palette[i] = `var(--ansi-${names[i]})`;
        palette[i + 8] = `var(--ansi-bright-${names[i]})`;
    }

    // 6x6x6 color cube (indices 16-231)
    for (let i = 16; i < 232; i++) {
        const j = i - 16;
        const r = Math.floor(j / 36);
        const g = Math.floor((j % 36) / 6);
        const b = j % 6;
        const rv = r === 0 ? 0 : r * 40 + 55;
        const gv = g === 0 ? 0 : g * 40 + 55;
        const bv = b === 0 ? 0 : b * 40 + 55;
        palette[i] = `rgb(${rv},${gv},${bv})`;
    }

    // Grayscale ramp (indices 232-255)
    for (let i = 232; i < 256; i++) {
        const gray = (i - 232) * 10 + 8;
        palette[i] = `rgb(${gray},${gray},${gray})`;
    }

    return palette;
};

// Pre-calculate the palette once
export const ANSI_PALETTE = generatePalette();

// --- Converter Section ---
const converter = new Convert({
    fg: 'var(--text-primary)',
    bg: 'transparent',
    newline: false,
    escapeXML: true,
    stream: false,
    colors: ANSI_PALETTE
});

// A simple Map-based cache to avoid re-parsing identical ANSI strings (like prompts or common attacks)
const cache = new Map<string, string>();
const MAX_CACHE_SIZE = 1000;

// --- Normalization Section ---
/**
 * Decomposes compound ANSI escape sequences (e.g. \x1b[38;5;128;40m) into
 * discrete, valid ANSI sequences (\x1b[38;5;128m\x1b[40m) so that standard
 * ANSI-to-HTML converters correctly recognize 256-color and truecolor codes.
 */
export const normalizeAnsiSequences = (text: string): string => {
    if (!text || !text.includes('\x1b[')) return text;

    return text.replace(/\x1b\[([0-9;]*)m/g, (match, paramStr) => {
        if (!paramStr) return '\x1b[0m';
        const parts = paramStr.split(';');
        const expanded: string[] = [];

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const num = parseInt(part, 10);

            if ((num === 38 || num === 48) && parts[i + 1] === '5' && parts[i + 2] !== undefined) {
                expanded.push(`\x1b[${num};5;${parts[i + 2]}m`);
                i += 2;
            } else if ((num === 38 || num === 48) && parts[i + 1] === '2' && parts[i + 4] !== undefined) {
                expanded.push(`\x1b[${num};2;${parts[i + 2]};${parts[i + 3]};${parts[i + 4]}m`);
                i += 4;
            } else if (!Number.isNaN(num)) {
                expanded.push(`\x1b[${num}m`);
            }
        }

        return expanded.join('');
    });
};

// --- Conversion Section ---
export const ansiConvert = {
    toHtml: (text: string): string => {
        if (!text) return '';

        let result = cache.get(text);
        if (result !== undefined) {
            return result;
        }

        let preprocessed = text;
        if (preprocessed.includes('&')) {
            // Translate MUME tags to ANSI escape sequences BEFORE html conversion.
            // This ensures they override any basic fallback ANSI escapes MUME already sent.

            // 1. &RGB (e.g., &500 for bright red)
            preprocessed = preprocessed.replace(/&([0-5])([0-5])([0-5])/g, (m, r, g, b) => {
                const ri = parseInt(r, 10);
                const gi = parseInt(g, 10);
                const bi = parseInt(b, 10);
                const index = 16 + (ri * 36 + gi * 6 + bi);
                return `\x1b[38;5;${index}m${m}`;
            });

            // 2. &greyN or &grayN (e.g., &grey3, &grey35, etc.)
            preprocessed = preprocessed.replace(/&(?:grey|gray)(\d+)/gi, (m, g) => {
                const level = parseInt(g, 10);
                const index = 232 + Math.floor((level - 3) / 4);
                if (index >= 232 && index <= 255) {
                    return `\x1b[38;5;${index}m${m}`;
                }
                return m;
            });

            // MUME reset tag
            preprocessed = preprocessed.replace(/&n/g, '\x1b[0m&n');
        }

        // Normalize compound ANSI sequences so 256-color + background contrast parses cleanly
        preprocessed = normalizeAnsiSequences(preprocessed);

        // Apply ansi-to-html exactly once on the preprocessed text
        result = converter.toHtml(preprocessed);

        if (cache.size >= MAX_CACHE_SIZE) {
            const firstKey = cache.keys().next().value;
            if (firstKey !== undefined) cache.delete(firstKey);
        }
        cache.set(text, result);

        return result;
    },
    // Expose the raw converter for anything else that might need it
    raw: converter
};

// --- Green Color Detection Section ---
/**
 * Checks if a CSS color string represents an ANSI green or bright green color.
 * Used to ensure numeric values/vital stats in status, score, info, etc. render at 100% opacity.
 */
export const isAnsiGreenColor = (color?: string): boolean => {
    if (!color) return false;
    const c = color.toLowerCase().trim();
    if (c.includes('green')) return true;
    if (c.includes('#55ff55') || c.includes('#00ff00') || c.includes('#00bb00')) return true;
    const rgbMatch = c.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (rgbMatch) {
        const r = parseInt(rgbMatch[1], 10);
        const g = parseInt(rgbMatch[2], 10);
        const b = parseInt(rgbMatch[3], 10);
        if (g >= 150 && g > r * 1.3 && g > b * 1.3) return true;
        if (r === 55 && g === 255 && b === 85) return true;
        if (r === 0 && g === 187 && b === 0) return true;
    }
    if (/^#([0-9a-f]{6})$/i.test(c)) {
        const r = parseInt(c.slice(1, 3), 16);
        const g = parseInt(c.slice(3, 5), 16);
        const b = parseInt(c.slice(5, 7), 16);
        if (g >= 150 && g > r * 1.3 && g > b * 1.3) return true;
    }
    return false;
};

// --- ANSI Stripping Section ---
/**
 * Strips all ANSI escape sequences, terminal control characters, and MUME color tags from a string.
 */
export const stripAnsiCodes = (text?: string | null): string => {
    if (!text) return '';
    return text
        .replace(/[\u001b\x1b\u2190]\[[0-9;?]*[ -/]*[@-~]/g, '')
        .replace(/[\u001b\x1b\u2190]/g, '')
        .replace(/&([0-5]{3}|(?:grey|gray)\d+|[nrgbycwmpkdlNRGBYCWMPKDL+*=\-])/g, '')
        .replace(/[\x00-\x1f\x7f-\x9f]/g, '')
        .trim();
};

