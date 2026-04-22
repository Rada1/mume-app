const lines = [
    "*[Mw] Ellessar (iMw)",
    "[Mw] Gamór (iMw)",
    "  *   Ellessar",
    "<something> Ellessar",
    "(hello) Ellessar",
    "*** Ellessar",
    "    Ellessar"
];

for (const textOnly of lines) {
    let cleanText = textOnly.trim();
    let lastLength = 0;
    while (cleanText.length !== lastLength) {
        lastLength = cleanText.length;
        cleanText = cleanText.replace(/^\[.*?\]\s*/, '');
        cleanText = cleanText.replace(/^<.*?>\s*/, '');
        cleanText = cleanText.replace(/^\(.*?\)\s*/, '');
        cleanText = cleanText.replace(/^\*.*?\*\s*/, '');
        cleanText = cleanText.replace(/^\*+\s*/, '');
    }
    const nameCandidate = cleanText.split(/\s+/)[0].replace(/[.,:;!]+$/, '');
    console.log(`Original: "${textOnly}" -> Candidate: "${nameCandidate}"`);
}
