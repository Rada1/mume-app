/**
 * @file environmentEventUtils.ts
 * @description Recognizes visible weather, light, sun, moon, and darkness event lines.
 */

// --- Logic Section ---

export const isEnvironmentEventLine = (text: string | null | undefined): boolean => {
    const lower = (text || '').toLowerCase();
    return (
        /starts to (rain|snow)|it is (raining|snowing|foggy)|rain stops|snow stops|clouds disappear|starts to fog|fog has (thinned|thickened|lifted|dissipated|disappeared)|thick fog covers|disappears into the fog|flash of lightning|lightning illuminates/i.test(lower) ||
        /\bthe sun (rises|sets)\b|\bthe moon (rises|sets)\b|\bthe evening star rises\b|\bthe morning star fades\b|\bsheen of the moon\b|\btilion carries it away\b/i.test(lower) ||
        /\bnecromancer'?s darkness\b|\bdarkness (gathers|grows|recedes|fades)\b|\blast light of the sun fades\b/i.test(lower)
    );
};
