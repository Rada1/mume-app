const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/context/GameContext.tsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log("Searching for 'useGame' inside GameContext.tsx...");
lines.forEach((line, index) => {
    if (line.includes('useGame') || line.includes('export const') || line.includes('export function')) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
    }
});
