const fs = require('fs');
const path = require('path');
const readline = require('readline');

const xmlPath = path.resolve(__dirname, '../public/ardagmcp.xml');
const manifestPath = path.resolve(__dirname, '../src/constants/audioManifest.ts');

if (!fs.existsSync(xmlPath)) {
    console.error(`XML file not found at ${xmlPath}`);
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

// 1. Read and parse zones from src/constants/audioManifest.ts
const manifestContent = fs.readFileSync(manifestPath, 'utf8');

// We can extract keys inside the `zones: { ... }` block
const zonesBlockMatch = manifestContent.match(/zones:\s*\{([\s\S]*?)\}\s*as\s*Record/);
if (!zonesBlockMatch) {
    console.error("Could not find zones block in audioManifest.ts");
    process.exit(1);
}

const zonesBlock = zonesBlockMatch[1];
const manifestKeys = new Set();
const keyRegex = /(?:'([^']+)'|"([^"]+)"|([a-zA-Z0-9_-]+))\s*:/g;
let match;
while ((match = keyRegex.exec(zonesBlock)) !== null) {
    const key = match[1] || match[2] || match[3];
    if (key) {
        const normKey = normalizeZone(key);
        if (normKey) {
            manifestKeys.add(normKey);
        }
    }
}

console.log(`Found ${manifestKeys.size} normalized zone keys in AUDIO_MANIFEST.ambient.zones.`);

// 2. Parse unique areas from ardagmcp.xml
// Since ardagmcp.xml is 23MB, reading it line-by-line is extremely memory efficient
const xmlAreas = new Set();
const instream = fs.createReadStream(xmlPath);
const outstream = new (require('stream'))();
const rl = readline.createInterface(instream, outstream);

rl.on('line', (line) => {
    // Look for tags that define zones/areas. E.g., <area name="..." or zone="..." or <zone ...>
    // Let's do a simple regex match for names of areas
    // Let's match: zone="something" or area="something" or name="something" inside specific tags
    // Or we can just find any occurrences of zone="..." or area="..."
    const zoneMatch = line.match(/\bzone="([^"]+)"/i) || line.match(/\barea="([^"]+)"/i);
    if (zoneMatch && zoneMatch[1]) {
        xmlAreas.add(zoneMatch[1].trim());
    }
});

rl.on('close', () => {
    console.log(`Found ${xmlAreas.size} unique area/zone strings in ardagmcp.xml.`);
    
    console.log("\n=== COMPARING XML ZONES ===");
    const missingXmlZones = [];
    const xmlAreasList = Array.from(xmlAreas).sort();

    for (const zone of xmlAreasList) {
        const norm = normalizeZone(zone);
        if (!manifestKeys.has(norm)) {
            missingXmlZones.push({ raw: zone, normalized: norm });
        }
    }

    console.log(`\nZones/areas in ardagmcp.xml that do NOT have a song mapped in audioManifest.ts (${missingXmlZones.length}):`);
    missingXmlZones.forEach(z => console.log(`- "${z.raw}" (normalized to "${z.normalized}")`));
});
