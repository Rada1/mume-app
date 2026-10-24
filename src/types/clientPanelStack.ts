/** @file clientPanelStack.ts — Shared panel identifiers and saved height weights. */

// --- Logic Section ---
export type ClientPanelStackId = 'entities' | 'chat' | 'actions' | 'details' | 'help';
export type ClientPanelStackWeights = Record<ClientPanelStackId, number>;
export type ClientPanelStackHeights = Record<ClientPanelStackId, number>;

