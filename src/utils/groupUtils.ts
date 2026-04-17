/**
 * @file groupUtils.ts
 * Shared utilities and constants for group members (colors, etc).
 */

export const GROUP_COLORS = [
    { core: '#bbf7d0', halo: '187, 247, 208', label: '#dcfce7' },
    { core: '#86efac', halo: '134, 239, 172', label: '#bbf7d0' },
    { core: '#a7f3d0', halo: '167, 243, 208', label: '#d1fae5' },
    { core: '#6ee7b7', halo: '110, 231, 183', label: '#a7f3d0' },
    { core: '#dcfce7', halo: '220, 252, 231', label: '#f0fdf4' },
    { core: '#4ade80', halo: '74, 222, 128', label: '#86efac' }
];

export const getMemberColor = (index: number) => {
    return GROUP_COLORS[index % GROUP_COLORS.length];
};
