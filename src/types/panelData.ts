/** @file panelData.ts — Session data readiness for panels. */
// --- Data Contracts ---
export type PanelDataKind = 'skills' | 'equipment' | 'inventory' | 'aliases' | 'shop' | 'gold';
export type PanelDataStatus = 'idle' | 'loading' | 'ready';
export type PanelDataSender = (command: string) => void;

export interface PanelDataState {
    session: string | null;
    status: Record<PanelDataKind, PanelDataStatus>;
    revision: number;
    setSession: (session: string | null) => void;
    request: (kind: PanelDataKind, send: PanelDataSender, force?: boolean) => void;
    complete: (kind: PanelDataKind) => void;
    fail: (kind: PanelDataKind) => void;
    invalidate: (kind: PanelDataKind) => void;
    isActive: (kind: PanelDataKind) => boolean;
    hasActiveRequest: () => boolean;
}

export interface GameplayPagerDeps {
    gameState: import('./game').GameState;
    sendCommand?: (command: string) => void;
    addMessage: (type: import('./game').MessageType, text: string) => void;
    ownsCapture: () => boolean;
}
