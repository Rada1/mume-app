/**
 * @file mapperPredictionQueue.test.ts
 * @description Tests movement prediction reconciliation after confirmed room updates.
 */

import { describe, expect, it } from 'vitest';
import { reconcilePredictions } from '../mapperPredictionQueue';
import { MapperPrediction } from '../mapperTypes';

// --- Logic Section ---
const prediction = (toId: string, seq: number): MapperPrediction => ({
    dir: 'n',
    toId,
    toX: seq,
    toY: 0,
    toZ: 0,
    createdAt: seq,
    seq
});

describe('reconcilePredictions', () => {
    it('removes the confirmed prediction from the head of the queue', () => {
        const result = reconcilePredictions([
            prediction('m_101', 1),
            prediction('m_102', 2),
        ], 'm_101');

        expect(result.predictions.map(item => item.toId)).toEqual(['m_102']);
    });

    it('drops skipped predictions when a later queued room is confirmed', () => {
        const result = reconcilePredictions([
            prediction('m_101', 1),
            prediction('m_102', 2),
            prediction('m_103', 3),
        ], '102');

        expect(result.predictions.map(item => item.toId)).toEqual(['m_103']);
    });

    it('drops only the head when the confirmed room id is not in the queue', () => {
        // Previously this wiped the whole queue. Now we assume the head was wrong
        // (id-normalization drift, ghost-vs-local-id mismatch) and keep the rest.
        const result = reconcilePredictions([
            prediction('m_101', 1),
            prediction('m_102', 2),
            prediction('m_103', 3),
        ], 'm_999');

        expect(result.predictions.map(item => item.toId)).toEqual(['m_102', 'm_103']);
    });

    it('matches by coordinates when ids disagree', () => {
        // Prediction stored as basemap vnum, but the server confirmed with a different id
        // (e.g. local ghost UUID). Coords should rescue the match.
        const result = reconcilePredictions([
            prediction('m_101', 1), // toX = 1
            prediction('m_102', 2), // toX = 2
            prediction('m_103', 3), // toX = 3
        ], 'ghost-abc', { x: 2, y: 0, z: 0 });

        expect(result.predictions.map(item => item.toId)).toEqual(['m_103']);
    });

    it('leaves the queue untouched when no id and no coords are provided', () => {
        // VNUM-0 dark rooms with no text-match call onRoomInfoProcessed(null). Dropping
        // the head silently here was eroding the trail through dark territory.
        const result = reconcilePredictions([
            prediction('m_101', 1),
            prediction('m_102', 2),
        ]);

        expect(result.changed).toBe(false);
        expect(result.predictions.map(item => item.toId)).toEqual(['m_101', 'm_102']);
    });

    it('tolerates fractional coord jitter when matching by coords', () => {
        const result = reconcilePredictions([
            prediction('m_101', 1),
            prediction('m_102', 2),
        ], 'ghost-abc', { x: 1.2, y: -0.1, z: 0 });

        expect(result.predictions.map(item => item.toId)).toEqual(['m_102']);
    });
});
