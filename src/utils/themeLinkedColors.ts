/**
 * @file themeLinkedColors.ts
 * @description Theme-linked color transforms for dark/light category colors.
 */

export type LinkedColorTheme = 'dark' | 'light';

// --- Constants ---

const LIGHT_MODE_LIGHTNESS_DELTA = 22;

interface ParsedColor {
    r: number;
    g: number;
    b: number;
    a?: number;
    format: 'hex' | 'rgb' | 'rgba';
}

interface HslColor {
    h: number;
    s: number;
    l: number;
}

// --- Public API ---

export const toThemeLinkedColor = (color: string | null | undefined, theme: LinkedColorTheme): string | null => {
    if (!color) return null;
    return theme === 'light'
        ? shiftColorLightness(color, -LIGHT_MODE_LIGHTNESS_DELTA)
        : color;
};

export const fromThemeLinkedColorInput = (color: string, theme: LinkedColorTheme): string => (
    theme === 'light'
        ? shiftColorLightness(color, LIGHT_MODE_LIGHTNESS_DELTA)
        : color
);

export const toColorInputHex = (color: string | null | undefined, fallback = '#ffffff'): string => {
    const parsed = parseColor(color);
    if (!parsed) return fallback;
    return rgbToHex(parsed.r, parsed.g, parsed.b);
};

// --- Logic Section ---

const shiftColorLightness = (color: string, delta: number): string => {
    const parsed = parseColor(color);
    if (!parsed) return color;

    const hsl = rgbToHsl(parsed.r, parsed.g, parsed.b);
    const shifted = hslToRgb({
        ...hsl,
        l: clamp(hsl.l + delta, 0, 100)
    });

    return formatColor({ ...parsed, ...shifted });
};

const parseColor = (color: string | null | undefined): ParsedColor | null => {
    if (!color) return null;
    const trimmed = color.trim();
    const hex = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hex) {
        const value = hex[1].length === 3
            ? hex[1].split('').map(char => char + char).join('')
            : hex[1];
        return {
            r: parseInt(value.slice(0, 2), 16),
            g: parseInt(value.slice(2, 4), 16),
            b: parseInt(value.slice(4, 6), 16),
            format: 'hex'
        };
    }

    const rgb = trimmed.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([0-9.]+))?\s*\)$/i);
    if (!rgb) return null;

    const alpha = rgb[4] === undefined ? undefined : Number(rgb[4]);
    return {
        r: clamp(Number(rgb[1]), 0, 255),
        g: clamp(Number(rgb[2]), 0, 255),
        b: clamp(Number(rgb[3]), 0, 255),
        a: alpha === undefined || Number.isNaN(alpha) ? undefined : clamp(alpha, 0, 1),
        format: rgb[4] === undefined ? 'rgb' : 'rgba'
    };
};

const formatColor = (color: ParsedColor): string => {
    if (color.format === 'hex') return rgbToHex(color.r, color.g, color.b);
    if (color.format === 'rgba') return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a ?? 1})`;
    return `rgb(${color.r}, ${color.g}, ${color.b})`;
};

const rgbToHex = (r: number, g: number, b: number): string => (
    `#${[r, g, b].map(value => Math.round(value).toString(16).padStart(2, '0')).join('')}`
);

const rgbToHsl = (r: number, g: number, b: number): HslColor => {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const l = (max + min) / 2;

    if (max === min) return { h: 0, s: 0, l: l * 100 };

    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const h = max === rn
        ? ((gn - bn) / d + (gn < bn ? 6 : 0))
        : max === gn
            ? ((bn - rn) / d + 2)
            : ((rn - gn) / d + 4);

    return { h: h * 60, s: s * 100, l: l * 100 };
};

const hslToRgb = ({ h, s, l }: HslColor): Pick<ParsedColor, 'r' | 'g' | 'b'> => {
    const sn = s / 100;
    const ln = l / 100;
    const c = (1 - Math.abs(2 * ln - 1)) * sn;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = ln - c / 2;
    const [rp, gp, bp] = h < 60 ? [c, x, 0]
        : h < 120 ? [x, c, 0]
            : h < 180 ? [0, c, x]
                : h < 240 ? [0, x, c]
                    : h < 300 ? [x, 0, c]
                        : [c, 0, x];

    return {
        r: Math.round((rp + m) * 255),
        g: Math.round((gp + m) * 255),
        b: Math.round((bp + m) * 255)
    };
};

const clamp = (value: number, min: number, max: number): number => (
    Math.max(min, Math.min(max, value))
);
