
const fs = require('fs');
const content = fs.readFileSync('src/index.tsx', 'utf8');

let depth = 0;
const lines = content.split('\n');
let inMudClient = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('const MudClient =')) inMudClient = true;
    if (!inMudClient) continue;
    if (i + 1 > 3940) break;

    const opens = (line.match(/<div(?![^>]*\/>)/g) || []).length;
    const closes = (line.match(/<\/div>/g) || []).length;

    if (opens !== closes) {
        depth += opens - closes;
        console.log(`Line ${i + 1}: Depth ${depth > 0 ? '+' : ''}${depth} | ${line.trim().substring(0, 50)}`);
    }
}
