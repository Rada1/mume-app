/**
 * @file Verifies MMapper-style paired and hidden door labels on the canvas map.
 */
// --- Logic Section ---

import { describe, expect, it, vi } from 'vitest';
import { drawDoorLabels } from './drawDoorLabels';
import type { RenderContext } from './rendererUtils';

describe('canvas door labels', () => {
    it('draws a nearby hidden door pair once and ignores ordinary door names', () => {
        const fillText = vi.fn();
        const ctx = {
            save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), roundRect: vi.fn(),
            fill: vi.fn(), fillText, measureText: () => ({ width: 48 })
        } as unknown as CanvasRenderingContext2D;
        const preloaded = {
            '1': [0, 0, 0, '', {
                n: { target: '2', hasDoor: true, doorName: 'gate', flags: ['DOOR', 'HIDDEN'] },
                e: { target: '3', hasDoor: true, doorName: 'visible door', flags: ['DOOR'] }
            }],
            '2': [0, -1, 0, '', {
                s: { target: '1', hasDoor: true, doorName: 'arch', flags: ['DOOR', 'HIDDEN'] },
                e: { target: '5', hasDoor: true, doorName: 'hedge', flags: ['DOOR', 'HIDDEN'] }
            }],
            '3': [1, 0, 0, '', {}],
            '5': [1, -1, 0, '', {}]
        };
        const renderContext = {
            ctx, preloaded, explored: new Set(['1', '2', '3', '5']),
            currentZ: 0, invZoom: 1, unveilMap: false, treatMapAsExplored: false
        } as unknown as RenderContext;

        const floorIndex = { '0,0': ['1', '2', '3', '5'] };
        drawDoorLabels(renderContext, 0, 0, 0, 0, floorIndex);

        expect(fillText).toHaveBeenCalledTimes(1);
        expect(fillText.mock.calls[0]?.[0]).toBe('gate/arch');

        fillText.mockClear();
        renderContext.invZoom = 0.5;
        drawDoorLabels(renderContext, 0, 0, 0, 0, floorIndex);
        expect(fillText.mock.calls.map(call => call[0])).toEqual(['gate/arch', 'hedge']);
    });
});
