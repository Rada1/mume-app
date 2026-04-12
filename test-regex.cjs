const fs = require('fs');

const textOnly = `Voïx (V) begins some strange incantations...`;
const ACCENT_MAP = {
    'a': '[a\u00e0-\u00e5]',
    'e': '[e\u00e8-\u00eb]',
    'i': '[i\u00ec-\u00ef]',
    'o': '[o\u00f2-\u00f6]',
    'u': '[u\u00f9-\u00fc]',
    'n': '[n\u00f1]',
    'c': '[c\u00e7]'
};

const normalize = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const toAccentAgnosticCore = (s) => {
    let res = '';
    const norm = normalize(s);
    for (const char of norm) {
        if (ACCENT_MAP[char]) {
            res += ACCENT_MAP[char];
        } else {
            res += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }
    }
    return res;
};

const WORD_BOUNDARY_START = `(?:^|(?<=[\\s\\.,:;\\!'(m\\[>]))`;
const WORD_BOUNDARY_END = `(?=[\\s\\.,:;\\!'()&\\x1b\\]<]|&#(?:x27|39|apos);|$)`;
const toAccentAgnostic = (s) => `${WORD_BOUNDARY_START}${toAccentAgnosticCore(s)}${WORD_BOUNDARY_END}`;

console.log("Testing with ANSI codes...");
const ansiText = "\x1b[1;36mVoïx\x1b[0m (V) begins...";
const patternStr = toAccentAgnostic("Voïx");
const regex = new RegExp(patternStr, 'gi');
console.log("ANSI Match:", regex.test(ansiText));
console.log("ANSI Replaced:", ansiText.replace(regex, "<-MATCH->"));

console.log("\nTesting Ìlväeth...");
const testText3 = "Ìlväeth (IL) stops resting...";
const patternStr3 = toAccentAgnostic("Ilväeth");
const regex3 = new RegExp(patternStr3, 'gi');
console.log("Ìlväeth Match:", regex3.test(testText3));
console.log("Ìlväeth Replaced:", testText3.replace(regex3, "<-MATCH->"));
console.log("Pattern used:", patternStr3);console.log("\nTesting tags at boundaries...");
const tagText = "Ìlväeth</span> <span>the Elf (IL) is here.";
const patternStr4 = toAccentAgnostic("Ilväeth");
const regex4 = new RegExp(patternStr4, 'gi');
console.log("Tag Boundary Match:", regex4.test(tagText));
console.log("Tag Replaced:", tagText.replace(regex4, "<-MATCH->"));

console.log("\nTesting case-insensitive matching for leading accented letters...");
const text5 = "ÌLVÄETH says hi";
const patternStr5 = toAccentAgnostic("ilväeth");
const regex5 = new RegExp(patternStr5, 'gi');
console.log("Leading Accent Match:", regex5.test(text5));
console.log("Leading Accent Replaced:", text5.replace(regex5, "<-MATCH->"));

console.log("\nTesting start-of-line boundary with tags...");
const text6 = "<span>Ilväeth</span> is here";
const patternStr6 = toAccentAgnostic("Ilväeth");
const regex6 = new RegExp(patternStr6, 'gi');
console.log("Start-of-line Tag Match:", regex6.test(text6));
console.log("Start-of-line Tag Replaced:", text6.replace(regex6, "<-MATCH->"));
