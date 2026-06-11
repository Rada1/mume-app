/**
 * @file shaperPresence.ts
 * @description Peer identity, heartbeat, and roster tracking for Shaper collaboration.
 */

import { useEffect, useRef, useState } from 'react';
import { publishRawSocketMessage, subscribeRawSocket } from '../model/shaperProjectSync';

export interface ShaperPeerInfo {
    peerId: string;
    displayName: string;
    projectId: string | null;
}

type PresenceRosterEvent = { type: 'presence-roster'; peers: ShaperPeerInfo[] };

const isRosterEvent = (v: unknown): v is PresenceRosterEvent =>
    !!v && typeof v === 'object' && (v as { type?: unknown }).type === 'presence-roster';

const PEER_ID_KEY = 'mume.shaper.peerId';
const DISPLAY_NAME_KEY = 'mume.shaper.displayName';
const HEARTBEAT_MS = 15_000;

const getOrCreatePeerId = (): string => {
    if (typeof sessionStorage === 'undefined') return `peer-${Date.now()}`;
    const stored = sessionStorage.getItem(PEER_ID_KEY);
    if (stored) return stored;
    const id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `peer-${Date.now()}`;
    sessionStorage.setItem(PEER_ID_KEY, id);
    return id;
};

const readDisplayName = (): string => {
    if (typeof localStorage === 'undefined') return 'Builder';
    const stored = localStorage.getItem(DISPLAY_NAME_KEY);
    if (stored) return stored;
    const suffix = getOrCreatePeerId().slice(0, 6);
    const name = `Builder-${suffix}`;
    localStorage.setItem(DISPLAY_NAME_KEY, name);
    return name;
};

export const useShaperPresence = (projectId: string | null) => {
    const [peers, setPeers] = useState<ShaperPeerInfo[]>([]);
    const [displayName, setDisplayNameState] = useState(readDisplayName);
    const peerIdRef = useRef(getOrCreatePeerId());
    const projectIdRef = useRef(projectId);
    const displayNameRef = useRef(displayName);

    // Keep refs in sync with state
    useEffect(() => { displayNameRef.current = displayName; }, [displayName]);

    // Announce project change to relay so roster updates for other peers
    useEffect(() => {
        projectIdRef.current = projectId;
        publishRawSocketMessage({
            type: 'presence-hello',
            peerId: peerIdRef.current,
            displayName: displayNameRef.current,
            projectId,
        });
    }, [projectId]);

    // Register, heartbeat, and cleanup
    useEffect(() => {
        const peerId = peerIdRef.current;

        const heartbeat = () =>
            publishRawSocketMessage({
                type: 'presence-hello',
                peerId,
                displayName: displayNameRef.current,
                projectId: projectIdRef.current,
            });

        heartbeat();
        const interval = setInterval(heartbeat, HEARTBEAT_MS);

        const unsub = subscribeRawSocket(data => {
            if (isRosterEvent(data)) {
                setPeers(data.peers.filter(p => p.peerId !== peerId));
            }
        });

        return () => {
            clearInterval(interval);
            publishRawSocketMessage({ type: 'presence-bye', peerId });
            unsub();
        };
    }, []);

    const setDisplayName = (name: string) => {
        if (typeof localStorage !== 'undefined') localStorage.setItem(DISPLAY_NAME_KEY, name);
        displayNameRef.current = name;
        setDisplayNameState(name);
        publishRawSocketMessage({
            type: 'presence-update',
            displayName: name,
            projectId: projectIdRef.current,
        });
    };

    return { peers, myPeerId: peerIdRef.current, displayName, setDisplayName };
};
