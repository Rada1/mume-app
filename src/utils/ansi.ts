import Convert from 'ansi-to-html';

export const ansiConvert = new Convert({
    fg: 'var(--text-primary)',
    bg: 'transparent',
    newline: false,
    escapeXML: true,
    stream: true,
    colors: {
        0: 'var(--ansi-black)',
        1: 'var(--ansi-red)',
        2: 'var(--ansi-green)',
        3: 'var(--ansi-yellow)',
        4: 'var(--ansi-blue)',
        5: 'var(--ansi-magenta)',
        6: 'var(--ansi-cyan)',
        7: 'var(--ansi-white)',
        8: 'var(--ansi-bright-black)',
        9: 'var(--ansi-bright-red)',
        10: 'var(--ansi-bright-green)',
        11: 'var(--ansi-bright-yellow)',
        12: 'var(--ansi-bright-blue)',
        13: 'var(--ansi-bright-magenta)',
        14: 'var(--ansi-bright-cyan)',
        15: 'var(--ansi-bright-white)'
    }
});
