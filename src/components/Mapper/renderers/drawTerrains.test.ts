import { describe, it, expect, vi } from 'vitest';
import { applyRoomShading, drawTerrainTileIcon, MMAPPER_ROOM_DARK_COLOR, MMAPPER_ROOM_NO_SUNDEATH_COLOR } from './drawTerrains';

describe('applyRoomShading', () => {
    const createMockCtx = () => {
        return {
            save: vi.fn(),
            restore: vi.fn(),
            fillRect: vi.fn(),
            drawImage: vi.fn(),
            setTransform: vi.fn(),
            getTransform: vi.fn().mockReturnValue({ a: 1, d: 1, e: 0, f: 0 }),
            globalCompositeOperation: 'source-over',
            fillStyle: '',
            globalAlpha: 1.0,
        } as unknown as CanvasRenderingContext2D;
    };

    const createRCtx = (overrides: Record<string, any> = {}) => ({
        allRooms: {},
        preloaded: {},
        baseMapExitsRef: { current: {} },
        mapTileOpacity: 1.0,
        isDarkMode: true,
        ...overrides,
    });

    it('shades dark rooms with MMAPPER_ROOM_DARK_COLOR using multiply blend mode', () => {
        const ctx = createMockCtx();
        const rCtx = createRCtx({
            preloaded: {
                '100': [0, 0, 0, 'Cavern', {}, 'Dark Cave', '100', [], [], '', 1, 0], // light=1 (DARK)
            },
        });
        const r = { vnum: '100', x: 0, y: 0, light: 1 };

        applyRoomShading(ctx, r, 16, 1.0, rCtx);

        expect(ctx.save).toHaveBeenCalled();
        expect(ctx.globalCompositeOperation).toBe('multiply');
        expect(ctx.fillStyle).toBe(MMAPPER_ROOM_DARK_COLOR);
        expect(ctx.fillRect).toHaveBeenCalled();
        expect(ctx.restore).toHaveBeenCalled();
    });

    it('shades no_sundeath rooms with MMAPPER_ROOM_NO_SUNDEATH_COLOR using multiply blend mode', () => {
        const ctx = createMockCtx();
        const rCtx = createRCtx({
            preloaded: {
                '200': [0, 0, 0, 'Indoors', {}, 'Inn Room', '200', [], [], '', 2, 0], // light=2 (LIT), sundeath=0 (NO_SUNDEATH)
            },
        });
        const r = { vnum: '200', x: 0, y: 0, light: 2, sundeath: 0 };

        applyRoomShading(ctx, r, 16, 1.0, rCtx);

        expect(ctx.save).toHaveBeenCalled();
        expect(ctx.globalCompositeOperation).toBe('multiply');
        expect(ctx.fillStyle).toBe(MMAPPER_ROOM_NO_SUNDEATH_COLOR);
        expect(ctx.fillRect).toHaveBeenCalled();
        expect(ctx.restore).toHaveBeenCalled();
    });

    it('prioritizes dark over no_sundeath when both are present per MMapper rules', () => {
        const ctx = createMockCtx();
        const rCtx = createRCtx({
            preloaded: {
                '300': [0, 0, 0, 'Cavern', {}, 'Pitch Black Cave', '300', [], [], '', 1, 0], // light=1 (DARK) & sundeath=0
            },
        });
        const r = { vnum: '300', x: 0, y: 0, light: 1, sundeath: 0 };

        applyRoomShading(ctx, r, 16, 1.0, rCtx);

        expect(ctx.fillStyle).toBe(MMAPPER_ROOM_DARK_COLOR);
    });

    it('does not apply any tint to lit outdoor rooms with sundeath', () => {
        const ctx = createMockCtx();
        const rCtx = createRCtx({
            preloaded: {
                '400': [0, 0, 0, 'Field', {}, 'Sunny Meadow', '400', [], [], '', 2, 1], // light=2 (LIT), sundeath=1
            },
        });
        const r = { vnum: '400', x: 0, y: 0, light: 2, sundeath: 1 };

        applyRoomShading(ctx, r, 16, 1.0, rCtx);

        expect(ctx.fillRect).not.toHaveBeenCalled();
    });

    it('recognizes DARK and NOLIGHT mob/room flags', () => {
        const ctx = createMockCtx();
        const rCtx = createRCtx({
            allRooms: {
                '500': { id: '500', mobFlags: ['DARK'], light: 0, sundeath: 1 },
            },
        });
        const r = { vnum: '500', x: 0, y: 0 };

        applyRoomShading(ctx, r, 16, 1.0, rCtx);

        expect(ctx.fillStyle).toBe(MMAPPER_ROOM_DARK_COLOR);
    });

    it('recognizes NO_SUNDEATH mob/room flags', () => {
        const ctx = createMockCtx();
        const rCtx = createRCtx({
            allRooms: {
                '600': { id: '600', mobFlags: ['NO_SUNDEATH'], light: 2, sundeath: 1 },
            },
        });
        const r = { vnum: '600', x: 0, y: 0 };

        applyRoomShading(ctx, r, 16, 1.0, rCtx);

        expect(ctx.fillStyle).toBe(MMAPPER_ROOM_NO_SUNDEATH_COLOR);
    });
});

describe('drawTerrainTileIcon road & trail rendering', () => {
    const createMockCtx = () => {
        return {
            save: vi.fn(),
            restore: vi.fn(),
            fillRect: vi.fn(),
            drawImage: vi.fn(),
            setTransform: vi.fn(),
            getTransform: vi.fn().mockReturnValue({ a: 1, d: 1, e: 0, f: 0 }),
            globalCompositeOperation: 'source-over',
            fillStyle: '',
            globalAlpha: 1.0,
        } as unknown as CanvasRenderingContext2D;
    };

    const createMockImage = (name: string): HTMLImageElement => {
        return {
            name,
            complete: true,
            naturalWidth: 128,
            naturalHeight: 128,
        } as unknown as HTMLImageElement;
    };

    it('draws mmapper-road-ew for Road terrain with ew route suffix', () => {
        const ctx = createMockCtx();
        const roadEw = createMockImage('road-ew');
        const imagesRef = {
            current: {
                'mmapper-road-ew': roadEw,
                'mmapper-road-none': createMockImage('road-none'),
            }
        } as any;

        drawTerrainTileIcon(ctx, 10, 20, 16, 'Road', false, { current: {} }, imagesRef, 0, 'clear', 0, undefined, undefined, 'ew');

        expect(ctx.drawImage).toHaveBeenCalledWith(roadEw, expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number));
    });

    it('falls back to mmapper-road-none for Road terrain when no route suffix is present', () => {
        const ctx = createMockCtx();
        const roadNone = createMockImage('road-none');
        const imagesRef = {
            current: {
                'mmapper-road-none': roadNone,
            }
        } as any;

        drawTerrainTileIcon(ctx, 10, 20, 16, 'Road', false, { current: {} }, imagesRef, 0, 'clear', 0, undefined, undefined, undefined);

        expect(ctx.drawImage).toHaveBeenCalledWith(roadNone, expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number));
    });

    it('draws base terrain and trail overlay for non-road terrain with route suffix', () => {
        const ctx = createMockCtx();
        const fieldImg = createMockImage('terrain-field');
        const trailEwImg = createMockImage('trail-ew');
        const imagesRef = {
            current: {
                'mmapper-terrain-field': fieldImg,
                'mmapper-trail-ew': trailEwImg,
            }
        } as any;

        drawTerrainTileIcon(ctx, 10, 20, 16, 'Field', false, { current: {} }, imagesRef, 0, 'clear', 0, undefined, undefined, 'ew');

        expect(ctx.drawImage).toHaveBeenNthCalledWith(1, fieldImg, expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number));
        expect(ctx.drawImage).toHaveBeenNthCalledWith(2, trailEwImg, 10, 20, 16, 16);
    });
});
