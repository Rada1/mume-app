/**
 * @file useTelnetSocket.ts
 * @description Low-level WebSocket hook for telnet binary transport.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export function useTelnetSocket() {
    const [isConnected, setIsConnected] = useState(false);
    const [lastError, setLastError] = useState<string | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const onDataRef = useRef<((data: ArrayBuffer) => void) | null>(null);

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }
        setIsConnected(false);
    }, []);

    const connect = useCallback((url: string, onData: (data: ArrayBuffer) => void) => {
        disconnect();
        onDataRef.current = onData;
        
        try {
            const ws = new WebSocket(url);
            ws.binaryType = 'arraybuffer';
            socketRef.current = ws;

            ws.onopen = () => {
                setIsConnected(true);
                setLastError(null);
                console.log('[Socket] Connected to', url);
            };

            ws.onmessage = (event) => {
                console.log(`[Socket] onmessage type=${typeof event.data} proto=${Object.prototype.toString.call(event.data)}`);
                if (event.data instanceof ArrayBuffer) {
                    console.log(`[Socket] Received ${event.data.byteLength} bytes (binary)`);
                    if (onDataRef.current) onDataRef.current(event.data);
                } else if (typeof event.data === 'string') {
                    console.log(`[Socket] Received ${event.data.length} chars (string): "${event.data.substring(0, 30)}"`);
                    const encoder = new TextEncoder();
                    const buffer = encoder.encode(event.data).buffer as ArrayBuffer;
                    if (onDataRef.current) onDataRef.current(buffer);
                } else {
                    console.warn('[Socket] Unknown data type:', event.data);
                }
            };

            ws.onerror = (event) => {
                setLastError('WebSocket error');
                console.error('[Socket] Error:', event);
            };

            ws.onclose = () => {
                setIsConnected(false);
                console.log('[Socket] Disconnected');
            };

        } catch (err) {
            setLastError(err instanceof Error ? err.message : String(err));
            setIsConnected(false);
        }
    }, [disconnect]);

    const sendBytes = useCallback((bytes: Uint8Array | number[]) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
            socketRef.current.send(data);
        }
    }, []);

    useEffect(() => {
        return () => disconnect();
    }, [disconnect]);

    return {
        isConnected,
        lastError,
        sendBytes,
        connect,
        disconnect
    };
}
