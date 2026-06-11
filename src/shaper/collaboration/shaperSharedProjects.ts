/**
 * @file shaperSharedProjects.ts
 * @description Pull a shared project from the relay by its link/id, and build share links.
 */

import { useCallback } from 'react';
import { publishRawSocketMessage, subscribeRawSocket } from '../model/shaperProjectSync';

const HASH_KEY = 'shaper-project';

const isProjectSaved = (v: unknown): v is { type: 'project-saved'; doc: { id: string } } =>
    !!v && typeof v === 'object' && (v as { type?: unknown }).type === 'project-saved' &&
    typeof (v as { doc?: { id?: unknown } }).doc?.id === 'string';

// Build a shareable link whose hash carries the project id (the capability).
export const buildShaperShareLink = (projectId: string): string => {
    if (typeof window === 'undefined') return `#${HASH_KEY}=${projectId}`;
    const { origin, pathname } = window.location;
    return `${origin}${pathname}#${HASH_KEY}=${projectId}`;
};

// Accept a full link or a bare id and return the project id.
export const parseShaperShareCode = (input: string): string | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const match = trimmed.match(new RegExp(`${HASH_KEY}=([^&\\s]+)`));
    if (match) return decodeURIComponent(match[1]);
    // A bare code with no other URL noise is treated as the id itself.
    return /[\s/=]/.test(trimmed) ? null : trimmed;
};

export const readShareCodeFromHash = (): string | null => {
    if (typeof window === 'undefined') return null;
    return parseShaperShareCode(window.location.hash);
};

export const useShaperSharedProjects = (onProjectPulled: (projectId: string) => void) => {
    // Request a project by id; the typed `project-saved` reply is written to the local
    // store before raw listeners fire, so the project exists locally when we open it.
    // onFail fires if no snapshot arrives in time (bad link, unshared, or relay offline).
    const pullProject = useCallback((projectId: string, onFail?: () => void) => {
        let done = false;
        const unsub = subscribeRawSocket(data => {
            if (isProjectSaved(data) && data.doc.id === projectId) {
                done = true;
                unsub();
                onProjectPulled(projectId);
            }
        });
        publishRawSocketMessage({ type: 'sync-request', projectId });
        setTimeout(() => {
            if (done) return;
            unsub();
            onFail?.();
        }, 5000);
    }, [onProjectPulled]);

    return { pullProject };
};
