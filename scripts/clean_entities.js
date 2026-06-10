import fs from 'fs';

const rawData = JSON.parse(fs.readFileSync('mume_usable_entities.json', 'utf8'));

function cleanAndSort(list) {
    const vnumMap = new Map();
    
    for (const item of list) {
        // Match vnum at the start followed by colon or space
        const match = item.match(/^\s*(\d+)\s*:\s*(.*)$/);
        if (match) {
            const vnum = parseInt(match[1], 10);
            const rest = match[2].trim();
            // If we already have this vnum, we can keep the one with longer/more detailed description or just keep the first
            if (!vnumMap.has(vnum)) {
                vnumMap.set(vnum, rest);
            } else {
                const existing = vnumMap.get(vnum);
                if (rest.length > existing.length) {
                    vnumMap.set(vnum, rest);
                }
            }
        } else {
            console.log(`Could not parse: ${item}`);
        }
    }
    
    // Convert back to sorted array of strings
    const sortedVnums = Array.from(vnumMap.keys()).sort((a, b) => a - b);
    return sortedVnums.map(vnum => `${vnum}: ${vnumMap.get(vnum)}`);
}

const cleanObjects = cleanAndSort(rawData.objects);
const cleanMobiles = cleanAndSort(rawData.mobiles);

const result = {
    objects: cleanObjects,
    mobiles: cleanMobiles,
    counts: {
        objects: cleanObjects.length,
        mobiles: cleanMobiles.length
    }
};

fs.writeFileSync('mume_usable_entities.json', JSON.stringify(result, null, 4));
console.log(`Cleanup complete! Unique objects: ${cleanObjects.length} (was ${rawData.counts.objects}), Unique mobiles: ${cleanMobiles.length} (was ${rawData.counts.mobiles}).`);
