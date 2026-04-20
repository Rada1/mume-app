const fs = require('fs');
const path = require('path');

function extractFile(patchFile) {
    if (!fs.existsSync(patchFile)) return;
    const text = fs.readFileSync(patchFile, 'utf16le'); // Read as UTF-16LE since PS > outputs that
    const lines = text.split('\n');
    let currentFile = null;
    let content = [];
    let capturing = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.startsWith('diff --git a/')) {
            if (capturing && currentFile) {
                const dir = path.dirname(currentFile);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(currentFile, content.join('\n'));
                console.log('Extracted', currentFile);
            }
            capturing = false;
            content = [];
            let match = line.match(/^diff --git a\/(\S+) b\/(\S+)/);
            if (match && (match[2].startsWith('src/__tests__/stores/') || match[2].startsWith('src/stores/') || match[2].startsWith('tests/stores/'))) {
                currentFile = match[2];
                capturing = true;
            }
        } else if (capturing) {
            if (line.startsWith('+++ ') || line.startsWith('--- ') || line.startsWith('index ') || line.startsWith('new file ') || line.startsWith('@@ ')) {
                continue;
            }
            if (line.startsWith('+')) {
                content.push(line.substring(1).replace(/\r$/, ''));
            } else if (line.startsWith(' ')) {
                content.push(line.substring(1).replace(/\r$/, ''));
            } else if (line === '' || line === '\r') {
                content.push('');
            } else if (line.startsWith('\\ No newline')) {
                continue; // Ignore
            }
        }
    }
    if (capturing && currentFile) {
        const dir = path.dirname(currentFile);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(currentFile, content.join('\n'));
        console.log('Extracted', currentFile);
    }
}

['phase11.patch'].forEach(extractFile);