/**
 * @file shaper-sync-relay.js
 * @description Capability-based WebSocket relay for Shaper.
 *   Projects are only handed out to peers that request them by id (the "link"),
 *   and live edits are routed only to peers that currently have that project open.
 */

import { WebSocketServer } from 'ws';
import { readFileSync, writeFileSync } from 'node:fs';

const port = Number(process.env.SHAPER_SYNC_PORT || 8092);
const storePath = process.env.SHAPER_STORE_PATH || 'shaper-projects.json';
const server = new WebSocketServer({ port });

// peerId -> { socket, peerId, displayName, projectId }
const peers = new Map();
// projectId -> full `project-saved` event object (the shared store)
const snapshots = new Map();

// --- Persistence Section ---
const loadStore = () => {
    try {
        const parsed = JSON.parse(readFileSync(storePath, 'utf8'));
        if (Array.isArray(parsed)) {
            for (const event of parsed) {
                if (event?.doc?.id) snapshots.set(event.doc.id, event);
            }
        }
        console.log(`Loaded ${snapshots.size} shared project(s) from ${storePath}`);
    } catch {
        console.log(`No existing store at ${storePath}; starting empty.`);
    }
};

let saveQueued = false;
const persistStore = () => {
    if (saveQueued) return;
    saveQueued = true;
    setTimeout(() => {
        saveQueued = false;
        try {
            writeFileSync(storePath, JSON.stringify([...snapshots.values()]));
        } catch (error) {
            console.error('Failed to persist shaper store:', error);
        }
    }, 250);
};

// --- Presence Section ---
const buildRoster = () =>
    [...peers.values()].map(({ peerId, displayName, projectId }) => ({ peerId, displayName, projectId }));

const send = (socket, message) => {
    if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
};

const sendRoster = socket => send(socket, { type: 'presence-roster', peers: buildRoster() });

const broadcastRoster = (exclude = null) => {
    for (const peer of peers.values()) {
        if (peer.socket !== exclude) sendRoster(peer.socket);
    }
};

// --- Routing Section ---
const projectIdOf = event =>
    event.type === 'project-saved' ? event.doc?.id : event.projectId;

// Forward a project event only to peers that currently have that project open.
const routeToProjectPeers = (event, str, senderSocket) => {
    const targetId = projectIdOf(event);
    if (!targetId) return;
    for (const peer of peers.values()) {
        if (peer.socket === senderSocket || peer.projectId !== targetId) continue;
        if (peer.socket.readyState === peer.socket.OPEN) peer.socket.send(str);
    }
};

// --- Relay Section ---
server.on('connection', socket => {
    let myPeerId = null;

    socket.on('message', raw => {
        const str = raw.toString();
        let parsed;
        try { parsed = JSON.parse(str); } catch { return; }

        if (parsed.type === 'presence-hello') {
            const { peerId, displayName, projectId = null } = parsed;
            const existing = peers.get(peerId);
            const projectChanged = !existing || existing.projectId !== projectId;
            myPeerId = peerId;
            peers.set(peerId, { socket, peerId, displayName: displayName ?? 'Builder', projectId });
            sendRoster(socket);
            // Sync the current snapshot when the peer opens a project they hold the link to.
            if (projectChanged && projectId && snapshots.has(projectId)) {
                send(socket, snapshots.get(projectId));
            }
            broadcastRoster(socket);
            return;
        }

        if (parsed.type === 'presence-update') {
            const peer = myPeerId ? peers.get(myPeerId) : null;
            if (peer) {
                if (parsed.displayName != null) peer.displayName = parsed.displayName;
                if (parsed.projectId !== undefined) peer.projectId = parsed.projectId;
                broadcastRoster();
            }
            return;
        }

        if (parsed.type === 'presence-bye') {
            if (parsed.peerId) {
                peers.delete(parsed.peerId);
                broadcastRoster();
            }
            return;
        }

        // Pull a project by id — this is the capability check: you must know the id (link).
        if (parsed.type === 'sync-request') {
            if (parsed.projectId && snapshots.has(parsed.projectId)) {
                send(socket, snapshots.get(parsed.projectId));
            }
            return;
        }

        // Stop sharing: drop the snapshot so no new peer can pull it. Existing
        // collaborators keep their local copy (no delete is fanned out).
        if (parsed.type === 'project-unshare') {
            if (parsed.projectId && snapshots.delete(parsed.projectId)) persistStore();
            return;
        }

        if (parsed.type === 'project-deleted' && parsed.projectId) {
            if (snapshots.delete(parsed.projectId)) persistStore();
            routeToProjectPeers(parsed, str, socket);
            return;
        }

        // Cache the newest snapshot per project id (only shared projects ever reach here).
        if (parsed.type === 'project-saved' && parsed.doc?.id) {
            const prev = snapshots.get(parsed.doc.id);
            if (!prev || (parsed.doc.updatedAt ?? 0) > (prev.doc?.updatedAt ?? 0)) {
                snapshots.set(parsed.doc.id, parsed);
                persistStore();
            }
        }

        // All other project events (room-patched, annotations, entities) route by membership.
        routeToProjectPeers(parsed, str, socket);
    });

    socket.on('close', () => {
        if (myPeerId) {
            peers.delete(myPeerId);
            broadcastRoster();
        }
    });
});

server.on('listening', () => {
    console.log(`Shaper sync relay listening on ws://localhost:${port}`);
});

loadStore();
