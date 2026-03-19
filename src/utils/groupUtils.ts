/**
 * @file groupUtils.ts
 * Shared utilities and constants for group members (colors, etc).
 */

export const GROUP_COLORS = [
    { core: '#22d3ee', halo: '34, 211, 238', label: '#67e8f9' }, // Cyan
    { core: '#fbbf24', halo: '251, 191, 36', label: '#fcd34d' }, // Amber
    { core: '#f472b6', halo: '244, 114, 182', label: '#f9a8d4' }, // Pink
    { core: '#818cf8', halo: '129, 140, 248', label: '#a5b4fc' }, // Indigo
    { core: '#fb923c', halo: '251, 146, 60', label: '#fdba74' }, // Orange
    { core: '#a3e635', halo: '163, 230, 53', label: '#bef264' }   // Lime
];

export const getMemberColor = (index: number) => {
    return GROUP_COLORS[index % GROUP_COLORS.length];
};
