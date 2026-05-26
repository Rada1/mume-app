/**
 * @file drawEntities.test.ts
 * @description Tests mapper opponent matching for duplicate room occupants.
 */

import { describe, expect, it } from 'vitest';
import { isOpponentOccupant } from '../../mapperOpponentUtils';
import { drawGrid } from '../drawEntities';
import { getPlayerBeaconMetrics } from '../playerBeacon';

describe('isOpponentOccupant', () => {
    it('matches by GMCP id even when multiple occupants share a name', () => {
        const occupants = [
            { id: 26, name: 'pack horse' },
            { id: 27, name: 'pack horse' },
            { id: 28, name: 'pack horse' },
        ];

        expect(isOpponentOccupant(occupants[1], occupants, 27, 'pack horse')).toBe(true);
        expect(isOpponentOccupant(occupants[0], occupants, 27, 'pack horse')).toBe(false);
    });

    it('does not match ambiguous duplicate names without a GMCP id', () => {
        const occupants = [
            { id: 26, name: 'pack horse' },
            { id: 27, name: 'pack horse' },
            { id: 28, name: 'pack horse' },
        ];

        expect(occupants.some(occupant => isOpponentOccupant(occupant, occupants, null, 'pack horse'))).toBe(false);
    });

    it('allows name fallback when exactly one visible occupant matches', () => {
        const occupants = [
            { id: 26, name: 'pack horse' },
            { id: 40, name: 'orc' },
        ];

        expect(isOpponentOccupant(occupants[1], occupants, null, 'orc')).toBe(true);
    });
});

describe('drawGrid', () => {
    it('sets strokeStyle to black/gray in dark mode', () => {
        const mockCtx = {
            strokeStyle: '',
            lineWidth: 0,
            beginPath: () => {},
            moveTo: () => {},
            lineTo: () => {},
            stroke: () => {},
        } as unknown as CanvasRenderingContext2D;

        const mockRenderCtx = {
            ctx: mockCtx,
            isDarkMode: true,
        } as unknown as any;

        drawGrid(mockRenderCtx, 0, 0, 1, 1);
        expect(mockCtx.strokeStyle).toBe('');
    });

    it('sets strokeStyle to white in light mode', () => {
        const mockCtx = {
            strokeStyle: '',
            lineWidth: 0,
            beginPath: () => {},
            moveTo: () => {},
            lineTo: () => {},
            stroke: () => {},
        } as unknown as CanvasRenderingContext2D;

        const mockRenderCtx = {
            ctx: mockCtx,
            isDarkMode: false,
        } as unknown as any;

        drawGrid(mockRenderCtx, 0, 0, 1, 1);
        expect(mockCtx.strokeStyle).toBe('');
    });
});

describe('getPlayerBeaconMetrics', () => {
    it('stays hidden at normal mapper zoom levels', () => {
        expect(getPlayerBeaconMetrics(0.5, 0)).toBeNull();
    });

    it('scales to a screen-stable beacon at far zoom levels', () => {
        const metrics = getPlayerBeaconMetrics(0.1, 0);

        expect(metrics).not.toBeNull();
        expect(metrics?.visibility).toBe(1);
        expect(metrics?.outerRadius).toBeGreaterThan(250);
        expect(metrics?.outerRadius).toBeLessThan(500);
        expect(metrics?.lineWidth).toBeCloseTo(17);
    });
});

