/**
 * @file shaperProjectSync.ts
 * @description BroadcastChannel and optional WebSocket transport for Shaper projects.
 */

import type { ShaperProjectEvent } from './shaperProjectStore';

const CHANNEL_NAME = 'mume.shaper.projects.sync';
const meta = import.meta as unknown as { env?: Record<string, string | undefined> };

let socket: WebSocket | null = null;
let socketUrl = '';
const socketListeners = new Set<(event: ShaperProjectEvent) => void>();
const pendingEvents: ShaperProjectEvent[] = [];

// --- Type Guards Section ---
const isProjectEvent = (value: unknown): value is ShaperProjectEvent => {
    if (!value || typeof value !== 'object') return false;
    const event = value as Partial<ShaperProjectEvent>;
    return event.type === 'project-saved' || event.type === 'project-deleted' ||
        event.type === 'room-patched' || event.type === 'annotation-added' ||
        event.type === 'annotation-removed' || event.type === 'mob-added' ||
        event.type === 'mob-removed' || event.type === 'object-added' ||
        event.type === 'object-removed' || event.type === 'mob-object-added' ||
        event.type === 'mob-object-removed';
};

// --- WebSocket Section ---
const readSyncUrl = (): string => meta.env?.VITE_SHAPER_SYNC_URL ?? '';

const openSocket = (): WebSocket | null => {
    const nextUrl = readSyncUrl();
    if (!nextUrl || typeof WebSocket === 'undefined') return null;
    if (socket && socketUrl === nextUrl) return socket;

    socketUrl = nextUrl;
    socket = new WebSocket(nextUrl);
    socket.addEventListener('open', () => {
        while (socket?.readyState === WebSocket.OPEN && pendingEvents.length > 0) {
            socket.send(JSON.stringify(pendingEvents.shift()));
        }
    });
    socket.addEventListener('message', event => {
        try {
            const parsed = JSON.parse(String(event.data)) as unknown;
            if (isProjectEvent(parsed)) socketListeners.forEach(listener => listener(parsed));
        } catch {
            // Ignore malformed relay traffic.
        }
    });
    socket.addEventListener('close', () => { socket = null; });
    return socket;
};

const publishSocket = (event: ShaperProjectEvent): void => {
    const activeSocket = openSocket();
    if (!activeSocket) return;
    if (activeSocket.readyState === WebSocket.OPEN) activeSocket.send(JSON.stringify(event));
    else pendingEvents.push(event);
};

// --- Public Transport Section ---
export const publishShaperProjectEvent = (event: ShaperProjectEvent): void => {
    if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel(CHANNEL_NAME);
        channel.postMessage(event);
        channel.close();
    }
    publishSocket(event);
};

export const subscribeShaperProjectSync = (
    onEvent: (event: ShaperProjectEvent) => void
): (() => void) => {
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;
    const handleMessage = (event: MessageEvent<ShaperProjectEvent>) => onEvent(event.data);
    channel?.addEventListener('message', handleMessage);
    socketListeners.add(onEvent);
    openSocket();

    return () => {
        channel?.removeEventListener('message', handleMessage);
        channel?.close();
        socketListeners.delete(onEvent);
    };
};
