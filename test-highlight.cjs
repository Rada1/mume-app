
// let's manually replicate safeHighlight
function safeHighlightManual(html, textToHighlight, isRegex, replaceFn) {
    if (!textToHighlight) return html;

    let regex = null;
    const escaped = isRegex ? textToHighlight : textToHighlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    if (isRegex) {
        regex = new RegExp(escaped, 'gi');
    } else {
        const pattern = `(?<![A-Za-z\\u00C0-\\u024F])${escaped}(?![A-Za-z\\u00C0-\\u024F])`;
        regex = new RegExp(pattern, 'gi');
    }

    const segments = html.split(/(<[^>]+>)/g);
    for (let i = 0; i < segments.length; i++) {
        if (i % 2 === 0) {
            segments[i] = segments[i].replace(regex, (match) => {
                return replaceFn(match);
            });
        }
    }
    return segments.join('');
}

const originalHtml = '*[Mw] Ellessar (iMw)';
const nameCandidate = 'Ellessar';
// htmlNameCandidate calculation from useSpecialLineWrappers.ts:
const htmlNameCandidate = nameCandidate.replace(/[^\x00-\x7F]/g, c => `&#x${c.codePointAt(0).toString(16).toUpperCase()};`);

console.log('htmlNameCandidate:', htmlNameCandidate);
const result = safeHighlightManual(originalHtml, htmlNameCandidate, false, (m) => `[BUTTON:${m}]`);
console.log('result:', result);

const originalHtml2 = '[Mw] Gamór (iMw)';
const nameCandidate2 = 'Gamór';
const htmlNameCandidate2 = nameCandidate2.replace(/[^\x00-\x7F]/g, c => `&#x${c.codePointAt(0).toString(16).toUpperCase()};`);
console.log('htmlNameCandidate2:', htmlNameCandidate2);
const result2 = safeHighlightManual(originalHtml2, htmlNameCandidate2, false, (m) => `[BUTTON:${m}]`);
console.log('result2:', result2);

const originalHtml3 = '<span class="ansi-yellow-fg">*[Mw] </span><span class="ansi-bold ansi-white-fg">Ellessar </span><span class="ansi-yellow-fg">(iMw)</span>';
console.log('htmlNameCandidate3:', htmlNameCandidate);
const result3 = safeHighlightManual(originalHtml3, htmlNameCandidate, false, (m) => `[BUTTON:${m}]`);
console.log('result3:', result3);
