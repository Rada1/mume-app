/** Parses compact `info %c %a %K` output into panel-ready character data. */
export const parseCitizenshipAgeWarFameInfo = (content: string) => {
    // `%c` produces one whitespace-separated place name per citizenship, followed
    // by the numeric `%a` age and `%K` war-fame values.
    const match = content.trim().match(/^(?:(.*?)\s+)?(\d+(?:\.\d+)?)\s+(-?\d+)$/);
    if (!match) return null;

    const citizenshipText = match[1]?.trim() || '';
    const citizenshipTokens = citizenshipText.split(/\s+/).filter(Boolean);
    // Avoid interpreting unrelated prose that happens to end in two numbers as
    // an info response. Citizenship entries are MUME's capitalized one-word keys.
    if (citizenshipTokens.length > 0 &&
        !/^(?:none|no|nil)$/i.test(citizenshipText) &&
        !citizenshipTokens.every(token => /^\p{Lu}[\p{L}'-]*$/u.test(token))) return null;
    const citizenships = !citizenshipText || /^(?:none|no|nil)$/i.test(citizenshipText)
        ? 0
        : citizenshipTokens.length;

    return {
        citizenships,
        age: match[2],
        warFame: Number(match[3])
    };
};
