const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else {
            callback(dirPath);
        }
    });
}

console.log("Searching for 'zoneMusic' across the src directory...");
walkDir(path.resolve(__dirname, '../src'), (filePath) => {
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('zoneMusic')) {
            const lines = content.split('\n');
            lines.forEach((line, index) => {
                if (line.includes('zoneMusic')) {
                    console.log(`${path.relative(path.resolve(__dirname, '..'), filePath)}:${index + 1}: ${line.trim()}`);
                }
            });
        }
    }
});
