/**
 * @file groupUtils.ts
 * Shared utilities and constants for group members (colors, etc).
 */

export const GROUP_COLORS = [
    { core: '#22c55e', halo: '34, 197, 94', label: '#4ade80' },
    { core: '#16a34a', halo: '22, 163, 74', label: '#22c55e' },
    { core: '#15803d', halo: '21, 128, 61', label: '#16a34a' },
    { core: '#4ade80', halo: '74, 222, 128', label: '#86efac' },
    { core: '#10b981', halo: '16, 185, 129', label: '#34d399' },
    { core: '#059669', halo: '5, 150, 105', label: '#10b981' }
];

export const getMemberColor = (index: number) => {
    return GROUP_COLORS[index % GROUP_COLORS.length];
};
