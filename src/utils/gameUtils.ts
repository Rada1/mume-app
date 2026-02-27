/**
 * Extracts a meaningful noun from a game item/player description.
 * Useful for drawer interactive buttons.
 */
export const extractNoun = (text: string): string => {
    let clean = text.replace(/<[^>]*>/g, '').replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').trim();
    clean = clean.replace(/[.,:;!]+$/, '');
    const words = clean.split(/[\s,.-]+/).filter(w => w.length > 1 && !/^(a|an|the|of|in|on|at|to|some|several)$/i.test(w));
    return words.length > 0 ? words[words.length - 1].toLowerCase().replace(/[^\w]/g, '') : '';
};
