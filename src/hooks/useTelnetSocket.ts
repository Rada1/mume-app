/**
 * @file useTelnetSocket.ts
 * @description Low-level WebSocket hook for telnet binary transport.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

const RECONNECT_DELAY_MS = 800;

export function useTelnetSocket() {
    const [isConnected, setIsConnected] = useState(false);
    const [lastError, setLastError] = useState<string | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const onDataRef = useRef<((data: ArrayBuffer) => void) | null>(null);
    const urlRef = useRef<string | null>(null);
    const wantsConnectionRef = useRef(false);
    const reconnectTimerRef = useRef<number | null>(null);

    const clearReconnectTimer = useCallback(() => {
        if (reconnectTimerRef.current === null) return;
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
    }, []);

    const closeSocket = useCallback((manual: boolean) => {
        if (manual) {
            wantsConnectionRef.current = false;
            clearReconnectTimer();
        }

        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }
        setIsConnected(false);
    }, [clearReconnectTimer]);

    const openSocket = useCallback((url: string, onData: (data: ArrayBuffer) => void) => {
        try {
            let finalUrl = url;
            if (typeof window !== 'undefined' && window.location.hostname) {
                const hostname = window.location.hostname;
                if (hostname.endsWith('discordsays.com')) {
                    // Rewrite wss://mume.org/ to the Discord URL Mapping proxy
                    finalUrl = url.replace(/wss:\/\/mume\.org\//, `wss://${hostname}/mume-ws/`);
                } else if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
                    finalUrl = url.replace(/\/\/(localhost|127\.0\.0\.1)(:|\/|$)/, `//${hostname}$2`);
                }
            }
            const ws = new WebSocket(finalUrl);
            ws.binaryType = 'arraybuffer';
            socketRef.current = ws;

            ws.onopen = () => {
                setIsConnected(true);
                setLastError(null);
            };

            ws.onmessage = (event) => {
                if (event.data instanceof ArrayBuffer) {
                    if (onDataRef.current) onDataRef.current(event.data);
                } else if (typeof event.data === 'string') {
                    const encoder = new TextEncoder();
                    const buffer = encoder.encode(event.data).buffer as ArrayBuffer;
                    if (onDataRef.current) onDataRef.current(buffer);
                }
            };

            ws.onerror = () => {
                setLastError('WebSocket error');
            };

            ws.onclose = () => {
                if (socketRef.current === ws) socketRef.current = null;
                setIsConnected(false);
                if (!wantsConnectionRef.current) return;
                if (document.visibilityState !== 'visible') return;
                clearReconnectTimer();
                reconnectTimerRef.current = window.setTimeout(() => {
                    if (urlRef.current && onDataRef.current && wantsConnectionRef.current) {
                        openSocket(urlRef.current, onDataRef.current);
                    }
                }, RECONNECT_DELAY_MS);
            };

        } catch (err) {
            setLastError(err instanceof Error ? err.message : String(err));
            setIsConnected(false);
        }
    }, [clearReconnectTimer]);

    const disconnect = useCallback(() => closeSocket(true), [closeSocket]);

    const connect = useCallback((url: string, onData: (data: ArrayBuffer) => void) => {
        closeSocket(false);
        clearReconnectTimer();
        urlRef.current = url;
        onDataRef.current = onData;
        wantsConnectionRef.current = true;
        openSocket(url, onData);
    }, [clearReconnectTimer, closeSocket, openSocket]);

    const sendBytes = useCallback((bytes: Uint8Array | number[]) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
            socketRef.current.send(data);
        }
    }, []);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState !== 'visible') return;
            if (!wantsConnectionRef.current || socketRef.current || !urlRef.current || !onDataRef.current) return;
            openSocket(urlRef.current, onDataRef.current);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleVisibilityChange);
            closeSocket(true);
        };
    }, [closeSocket, openSocket]);

    return {
        isConnected,
        lastError,
        sendBytes,
        connect,
        disconnect
    };
}
