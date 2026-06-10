import fs from 'fs';

const cleanData = fs.readFileSync('raw_stat_test.txt', 'utf8').replace(/\x1b\[[0-9;]*m/g, '');
const lines = cleanData.split('\n');

let currentBlock = [];
let currentType = null;
let currentVnum = null;
let currentName = null;
const entitiesMap = {
    objects: {},
    mobiles: {}
};

const finalizeBlock = () => {
    if (currentVnum !== null && currentBlock.length > 0) {
        const blockText = currentBlock.join('\n').trim();
        const entityData = parseEntityText(currentType, currentVnum, currentName, blockText);
        
        if (currentType === 'object') {
            entitiesMap.objects[currentVnum] = entityData;
        } else if (currentType === 'mobile') {
            entitiesMap.mobiles[currentVnum] = entityData;
        }
    }
    currentBlock = [];
    currentVnum = null;
    currentName = null;
};

function parseEntityText(type, vnum, name, text) {
    const lines = text.split('\n');
    
    if (type === 'object') {
        let objType = 'OTHER';
        let weight = 0;
        let value = 0;
        let extraFlags = [];
        let wearFlags = [];

        for (const line of lines) {
            const shortMatch = line.match(/Short description:\s*(.*)$/i);
            if (shortMatch) name = shortMatch[1].trim();

            const typeMatch = line.match(/Item type:\s*([A-Za-z0-9_-]+)/i);
            if (typeMatch) objType = typeMatch[1].trim();

            const weightMatch = line.match(/Weight:\s*\[?\s*(\d+)\s*\]?/i);
            if (weightMatch) weight = parseInt(weightMatch[1], 10);

            const valueMatch = line.match(/Value:\s*\[?\s*(\d+)\s*\]?/i);
            if (valueMatch) value = parseInt(valueMatch[1], 10);

            const wearMatch = line.match(/Wear flags:\s*\[?\s*([^\]\n]+)\s*\]?/i);
            if (wearMatch) wearFlags = wearMatch[1].split(/\s+/).map(f => f.trim()).filter(Boolean);

            const extraMatch = line.match(/Extra flags:\s*\[?\s*([^\]\n]+)\s*\]?/i);
            if (extraMatch) extraFlags = extraMatch[1].split(/\s+/).map(f => f.trim()).filter(Boolean);
        }

        return {
            vnum,
            name: name || `Object ${vnum}`,
            type: objType,
            weight,
            value,
            extraFlags,
            wearFlags,
            rawText: text
        };
    } else if (type === 'mobile') {
        let level = 0;
        let mobClass = 'UNKNOWN';
        let align = 0;

        for (const line of lines) {
            const shortMatch = line.match(/Short desc:\[\s*([^\]]+)\s*\]/i);
            if (shortMatch) name = shortMatch[1].trim();

            const lvlMatch = line.match(/Level:\[\s*(\d+)\s*\]/i);
            if (lvlMatch) level = parseInt(lvlMatch[1], 10);

            const classMatch = line.match(/Type:\[\s*([^\]]+)\s*\]/i);
            if (classMatch) mobClass = classMatch[1].trim();

            const alignMatch = line.match(/Alignment:\[\s*(-?\d+)\s*\]/i);
            if (alignMatch) align = parseInt(alignMatch[1], 10);
        }

        return {
            vnum,
            name: name || `Mobile ${vnum}`,
            level,
            class: mobClass,
            align,
            rawText: text
        };
    }
}

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const objMatch = line.match(/V-number:\s*\[\s*(\d+)\s*\]/i);
    const mobMatch = line.match(/Id:\s*\[\s*(\d+)\s*\]/i);

    if (objMatch) {
        finalizeBlock();
        currentType = 'object';
        currentVnum = parseInt(objMatch[1], 10);
        currentName = '';
        currentBlock.push(line);
    } else if (mobMatch && line.includes('Instances:')) {
        finalizeBlock();
        currentType = 'mobile';
        currentVnum = parseInt(mobMatch[1], 10);
        currentName = '';
        currentBlock.push(line);
    } else {
        if (currentVnum !== null) {
            currentBlock.push(line);
        }
    }
}
finalizeBlock();

console.log('Parsed Entities:');
console.log(JSON.stringify(entitiesMap, null, 4));
