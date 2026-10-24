/** @file clientPanelStack.ts — Shared panel identifiers and saved height weights. */

// --- Logic Section ---
export type ClientPanelStackId = 'entities' | 'chat' | 'details' | 'help';
export type ClientPanelStackWeights = Record<ClientPanelStackId, number>;
export type ClientPanelStackHeights = Record<ClientPanelStackId, number>;

