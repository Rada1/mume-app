const fs = require('fs');
const path = require('path');

// Resolve absolute paths
const mapDataPath = path.resolve(__dirname, '../public/mume_map_data.json');
const manifestPath = path.resolve(__dirname, '../src/constants/audioManifest.ts');

if (!fs.existsSync(mapDataPath)) {
    console.error(`Map data not found at ${mapDataPath}`);
    process.exit(1);
}

if (!fs.existsSync(manifestPath)) {
    console.error(`Audio manifest not found at ${manifestPath}`);
    process.exit(1);
}

function normalizeZone(zone) {
    if (!zone) return null;
    return zone.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .replace(/^the\s+/i, '')
        .trim()
        .replace(/-/g, ' ')
        .replace(/\s+/g, ' ');
}

// 1. Parse unique zones from mume_map_data.json
const mapData = JSON.parse(fs.readFileSync(mapDataPath, 'utf8'));
const uniqueRawZones = new Set();

for (const vnum in mapData) {
    const room = mapData[vnum];
    const zone = room[9];
    if (zone && typeof zone === 'string' && zone.trim()) {
        uniqueRawZones.add(zone.trim());
    }
}

console.log(`Found ${uniqueRawZones.size} unique raw zones in mume_map_data.json.`);

// 2. Read and parse zones from src/constants/audioManifest.ts
const manifestContent = fs.readFileSync(manifestPath, 'utf8');

// We can extract keys inside the `zones: { ... }` block
const zonesBlockMatch = manifestContent.match(/zones:\s*\{([\s\S]*?)\}\s*as\s*Record/);
if (!zonesBlockMatch) {
    console.error("Could not find zones block in audioManifest.ts");
    process.exit(1);
}

const zonesBlock = zonesBlockMatch[1];
// Extract keys using a regex: 'key': or "key": or key:
const manifestKeys = new Set();
const keyRegex = /(?:'([^']+)'|"([^"]+)"|([a-zA-Z0-9_-]+))\s*:/g;
let match;
while ((match = keyRegex.exec(zonesBlock)) !== null) {
    const key = match[1] || match[2] || match[3];
    if (key) {
        // Also normalize manifest keys just in case
        const normKey = normalizeZone(key);
        if (normKey) {
            manifestKeys.add(normKey);
        }
    }
}

console.log(`Found ${manifestKeys.size} normalized zone keys in AUDIO_MANIFEST.ambient.zones.\n`);

// 3. Compare zones
console.log("=== COMPARING ZONES (WITH CORRECT NORMALIZATION) ===");
const missingRawZones = [];
const uniqueZonesList = Array.from(uniqueRawZones).sort();

for (const zone of uniqueZonesList) {
    const norm = normalizeZone(zone);
    if (!manifestKeys.has(norm)) {
        missingRawZones.push({ raw: zone, normalized: norm });
    }
}

console.log(`\nZones in mume_map_data.json that do NOT have a song mapped in audioManifest.ts (${missingRawZones.length}):`);
missingRawZones.forEach(z => console.log(`- "${z.raw}" (normalized to "${z.normalized}")`));

// 4. Check if there are any MP3 files on disk that are NOT in the manifest
const zoneSoundsDir = path.resolve(__dirname, '../public/assets/Sounds/ZoneSounds');
if (fs.existsSync(zoneSoundsDir)) {
    const files = fs.readdirSync(zoneSoundsDir).filter(f => f.endsWith('.mp3') || f.endsWith('.wav'));
    
    // Check if any of these files are NOT referenced in the manifest
    const referencedFiles = new Set();
    const urlRegex = /url:\s*(?:'([^']+)'|"([^"]+)"|\[([\s\S]*?)\])/g;
    let urlMatch;
    while ((urlMatch = urlRegex.exec(manifestContent)) !== null) {
        if (urlMatch[1]) referencedFiles.add(path.basename(urlMatch[1]));
        if (urlMatch[2]) referencedFiles.add(path.basename(urlMatch[2]));
        if (urlMatch[3]) {
            const arrMatches = urlMatch[3].match(/(?:'([^']+)'|"([^"]+)")/g);
            if (arrMatches) {
                arrMatches.forEach(item => {
                    const clean = item.replace(/['"]/g, '');
                    referencedFiles.add(path.basename(clean));
                });
            }
        }
    }
    
    const unreferencedFiles = files.filter(f => !referencedFiles.has(f));
    console.log(`\nFiles on disk that are NOT referenced in audioManifest.ts (${unreferencedFiles.length}):`);
    unreferencedFiles.forEach(f => console.log(`- ${f}`));
}
