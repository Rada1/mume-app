import Convert from 'ansi-to-html';

const generatePalette = () => {
    const names = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
    const palette: Record<number, string> = {};

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

const converter = new Convert({
    fg: 'var(--text-primary)',
    bg: 'transparent',
    newline: false,
    escapeXML: true,
    stream: false, // Must be false when sharing the converter across independent strings
    colors: generatePalette()
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

        result = converter.toHtml(text);

        if (cache.size >= MAX_CACHE_SIZE) {
            // Evict the oldest entry (Map iterates in insertion order)
            const firstKey = cache.keys().next().value;
            if (firstKey !== undefined) cache.delete(firstKey);
        }
        cache.set(text, result);

        return result;
    },
    // Expose the raw converter for anything else that might need it
    raw: converter
};
