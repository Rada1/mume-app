/**
 * @file useArchiveStore.ts
 * @description Shared Zustand store for board and mail archive-style message views.
 */

import { create } from 'zustand';

export type ArchiveView = 'board' | 'board-threads' | 'mail-inbox' | 'mail-sent' | 'book';
export type ArchiveSource = 'board' | 'mail' | 'book';
export type ArchivePanelMode = 'board' | 'mail' | 'book';

export interface ArchiveEntry {
    id: number;
    source: ArchiveSource;
    view: ArchiveView;
    subject: string;
    author: string;
    date: string;
    isRead?: boolean;
    recipients?: string;
    depth?: number;
    replyCount?: number;
}

export interface ArchiveDetail extends ArchiveEntry {
    body: string;
}

export interface ArchiveComposeState {
    recipients: string;
    subject: string;
    body: string;
}

export type ArchiveEditorContext = {
    kind: 'archive-reply';
    source: Exclude<ArchiveSource, 'book'>;
    view: ArchiveView;
    entryId: number;
    subject: string;
    author: string;
} | {
    kind: 'archive-compose';
    source: Exclude<ArchiveSource, 'book'>;
    view: ArchiveView;
    subject: string;
    body: string;
} | {
    kind: 'self-description' | 'self-whois';
    action: 'read' | 'write';
    value?: string;
};

interface ArchiveStoreState {
    isOpen: boolean;
    panelMode: ArchivePanelMode;
    activeView: ArchiveView;
    entriesByView: Record<ArchiveView, ArchiveEntry[]>;
    activeDetail: ArchiveDetail | null;
    isLoadingList: boolean;
    isLoadingDetail: boolean;
    compose: ArchiveComposeState;
    pendingEditorContext: ArchiveEditorContext | null;
    setIsOpen: (open: boolean) => void;
    setPanelMode: (mode: ArchivePanelMode) => void;
    setActiveView: (view: ArchiveView) => void;
    setEntries: (view: ArchiveView, entries: ArchiveEntry[]) => void;
    setActiveDetail: (detail: ArchiveDetail | null) => void;
    setIsLoadingList: (loading: boolean) => void;
    setIsLoadingDetail: (loading: boolean) => void;
    setCompose: (compose: Partial<ArchiveComposeState>) => void;
    setPendingEditorContext: (context: ArchiveEditorContext | null) => void;
    consumePendingEditorContext: () => ArchiveEditorContext | null;
    clearArchive: () => void;
}

const emptyCompose: ArchiveComposeState = {
    recipients: '',
    subject: '',
    body: ''
};

const emptyEntries: Record<ArchiveView, ArchiveEntry[]> = {
    board: [],
    'board-threads': [],
    'mail-inbox': [],
    'mail-sent': [],
    book: []
};

export const useArchiveStore = create<ArchiveStoreState>((set, get) => ({
    isOpen: false,
    panelMode: 'board',
    activeView: 'board',
    entriesByView: emptyEntries,
    activeDetail: null,
    isLoadingList: false,
    isLoadingDetail: false,
    compose: emptyCompose,
    pendingEditorContext: null,

    setIsOpen: (isOpen) => set({ isOpen }),
    setPanelMode: (panelMode) => set({ panelMode }),
    setActiveView: (activeView) => set({ activeView, activeDetail: null }),
    setEntries: (view, entries) => set(state => ({
        entriesByView: { ...state.entriesByView, [view]: entries }
    })),
    setActiveDetail: (activeDetail) => set({ activeDetail }),
    setIsLoadingList: (isLoadingList) => set({ isLoadingList }),
    setIsLoadingDetail: (isLoadingDetail) => set({ isLoadingDetail }),
    setCompose: (compose) => set(state => ({ compose: { ...state.compose, ...compose } })),
    setPendingEditorContext: (pendingEditorContext) => set({ pendingEditorContext }),
    consumePendingEditorContext: () => {
        const context = get().pendingEditorContext;
        set({ pendingEditorContext: null });
        return context;
    },
    clearArchive: () => set({
        entriesByView: emptyEntries,
        activeDetail: null,
        isOpen: false,
        isLoadingList: false,
        isLoadingDetail: false,
        compose: emptyCompose,
        pendingEditorContext: null
    })
}));
