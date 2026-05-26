/**
 * @file mapperPredictionQueue.ts
 * @description Keeps queued mapper movement predictions aligned with confirmed rooms.
 */

import { MapperPrediction } from './mapperTypes';

// --- Types Section ---
export interface PredictionReconcileResult {
    predictions: MapperPrediction[];
    changed: boolean;
}

export interface ConfirmedRoomCoords {
    x: number;
    y: number;
    z: number;
}

// --- Logic Section ---
export const normalizePredictionRoomId = (id: string | null | undefined) => {
    return String(id || '').replace(/^m_/, '');
};

const coordsMatch = (pred: MapperPrediction, coords: ConfirmedRoomCoords) => {
    // Predictions and confirmed rooms can have fractional offsets from organic-terrain jitter,
    // so use a small epsilon. Tile-level identity is what matters.
    return Math.abs(pred.toX - coords.x) < 0.5
        && Math.abs(pred.toY - coords.y) < 0.5
        && Math.abs((pred.toZ ?? 0) - (coords.z ?? 0)) < 0.5;
};

export const reconcilePredictions = (
    predictions: MapperPrediction[],
    confirmedRoomId?: string | null,
    confirmedCoords?: ConfirmedRoomCoords | null
): PredictionReconcileResult => {
    if (predictions.length === 0) return { predictions, changed: false };

    if (!confirmedRoomId && !confirmedCoords) {
        // No info at all (e.g. VNUM-0 dark room with no text-match). Leave the queue alone —
        // a follow-up move-confirmed event with dead-reckoned coords/id will reconcile it
        // properly. Dropping the head here was the cause of the trail eroding through dark
        // rooms even when the move actually succeeded.
        return { predictions, changed: false };
    }

    const confirmed = confirmedRoomId ? normalizePredictionRoomId(confirmedRoomId) : null;

    let matchIndex = -1;
    // 1. Match by id first (cheapest and most precise).
    if (confirmed) {
        matchIndex = predictions.findIndex(p => normalizePredictionRoomId(p.toId) === confirmed);
    }
    // 2. Fallback: match by tile coordinates. Robust against id-normalization drift
    //    (basemap-vnum vs. local-uuid vs. serverIdIndex misses).
    if (matchIndex === -1 && confirmedCoords) {
        matchIndex = predictions.findIndex(p => coordsMatch(p, confirmedCoords));
    }

    if (matchIndex === -1) {
        // Still no match — assume only the head was wrong; keep the rest of the queue.
        // (Previous behavior wiped the whole queue, which made the trail "disappear"
        // any time an id-normalization disagreement happened.)
        return { predictions: predictions.slice(1), changed: true };
    }

    return {
        predictions: predictions.slice(matchIndex + 1),
        changed: true
    };
};
