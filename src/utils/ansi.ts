import Convert from 'ansi-to-html';

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

            // 2. &greyN (e.g., &grey3, &grey35, etc.)
            preprocessed = preprocessed.replace(/&grey(\d+)/g, (m, g) => {
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
