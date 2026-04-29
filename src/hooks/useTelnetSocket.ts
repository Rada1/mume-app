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
                setIsConnected(false);
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
