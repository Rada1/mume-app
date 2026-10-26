/** @file commandTreeMobileGestures.ts — Roots sharing the mobile movement and held-target panes. */
// --- Root Eligibility Section ---
export const isMobileCommandHoldGroup = (group: number | null): boolean =>
    group !== null && [0, 2, 3, 4].includes(group);
