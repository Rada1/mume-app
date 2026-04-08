import Convert from 'ansi-to-html';

const generatePalette = () => {
    const names = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
    const palette = new Array(256).fill('');

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

const convert = new Convert({ colors: generatePalette() });
console.log(convert.toHtml("\x1b[38;5;31mtest format\x1b[0m"));
