/**
 * @file groupUtils.ts
 * Shared utilities and constants for group members (colors, etc).
 */

export const GROUP_COLORS = [
    { core: '#bbf7d0', halo: '187, 247, 208', label: '#dcfce7' },
    { core: '#60a5fa', halo: '96, 165, 250', label: '#bfdbfe' },
    { core: '#f87171', halo: '248, 113, 113', label: '#fecaca' },
    { core: '#a78bfa', halo: '167, 139, 250', label: '#ddd6fe' },
    { core: '#fbbf24', halo: '251, 191, 36', label: '#fef3c7' },
    { core: '#2dd4bf', halo: '45, 212, 191', label: '#99f6e4' },
    { core: '#fb7185', halo: '251, 113, 133', label: '#fecdd3' },
    { core: '#a3e635', halo: '163, 230, 53', label: '#d9f99d' },
    { core: '#c084fc', halo: '192, 132, 252', label: '#e9d5ff' },
    { core: '#38bdf8', halo: '56, 189, 248', label: '#bae6fd' },
    { core: '#f97316', halo: '249, 115, 22', label: '#fed7aa' },
    { core: '#4ade80', halo: '74, 222, 128', label: '#bbf7d0' }
];

export const getMemberColor = (index: number) => {
    return GROUP_COLORS[index % GROUP_COLORS.length];
};
