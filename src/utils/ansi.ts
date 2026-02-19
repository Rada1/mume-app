import Convert from 'ansi-to-html';

export const ansiConvert = new Convert({
    fg: '#f0f0f0',
    bg: '#000000',
    newline: false,
    escapeXML: true,
    stream: true
});
