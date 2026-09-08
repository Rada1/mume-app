/**
 * @file environmentEventUtils.ts
 * @description Recognizes visible weather, light, sun, moon, and darkness event lines.
 */

// --- Logic Section ---

export const isEnvironmentEventLine = (text: string | null | undefined): boolean => {
    const lower = (text || '').toLowerCase();
    return (
        /starts to (rain|snow|hail|clear)|it is (raining|snowing|foggy)|rain stops|snow stops|clouds disappear|starts to fog|fog has (thinned|thickened|lifted|dissipated|disappeared)|thick fog covers|disappears into the fog|flash of lightning|lightning illuminates/i.test(lower) ||
        /\bthe sun (rises|sets|begins to rise|begins to set)\b|\bthe moon (rises|sets|begins to rise|begins to set)\b|\bthe evening star rises\b|\bthe morning star fades\b|\bsheen of the moon\b|\btilion\b|\banar\b|\bvalinor sky\b/i.test(lower) ||
        /\bnecromancer'?s darkness\b|\bdarkness (gathers|grows|recedes|fades|begins to fade)\b|\blast light of the sun fades\b|\blight of the sun returns\b/i.test(lower)
    );
};
