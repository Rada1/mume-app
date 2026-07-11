/**
 * @file shaperCapture.test.ts
 * @description Unit tests for shaper mobile/object find capture triggers and line parsing.
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useCaptureParser, CaptureParserDeps } from '../useCaptureParser';
import { renderHook, act } from '@testing-library/react';
import { useShaperEntityStore } from '../../../shaper/model/useShaperEntityStore';

describe('useCaptureParser shaper triggers and parsing', () => {
    const createMockDeps = (): CaptureParserDeps => ({
        captureSession: null,
        setCaptureSession: vi.fn(),
        setInventoryLines: vi.fn(),
        setEqLines: vi.fn(),
        setStatsLines: vi.fn(),
        setPracticeLines: vi.fn(),
        setWhoLines: vi.fn(),
        setWhoList: vi.fn(),
        setScoreLines: vi.fn(),
        setInfoLines: vi.fn(),
        setQuestLines: vi.fn(),
        setAchievementLines: vi.fn(),
        setContainerContents: vi.fn(),
        registerEntity: vi.fn(),
        ansiConvert: { toHtml: (s: string) => s },
        captureStage: { current: 'idle' }
    });

    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('detects shaper search and stat triggers', () => {
        const deps = createMockDeps();
        const { result } = renderHook(() => useCaptureParser(deps));

        // Test search triggers
        expect(result.current.checkTriggers('Mobiles matching "orc":')).toBe('shaper_mob_find');
        expect(result.current.checkTriggers('Objects matching "sword":')).toBe('shaper_obj_find');
        expect(result.current.checkTriggers('10 matching mobiles found.')).toBe('shaper_mob_find');
        expect(result.current.checkTriggers('10 matching objects found.')).toBe('shaper_obj_find');

        // Test stat triggers
        expect(result.current.checkTriggers("Mobile 'an Ohurk-uai soldier', vnum 70.")).toBe('shaper_mob_stat');
        expect(result.current.checkTriggers("Object 'a dirty uruk', vnum 71.")).toBe('shaper_obj_stat');
    });

    it('correctly parses mob find results from MUME /num m output format', () => {
        const deps = createMockDeps();
        const mockSetMobilesResult = vi.fn();
        
        vi.spyOn(useShaperEntityStore, 'getState').mockReturnValue({
            setMobilesResult: mockSetMobilesResult
        } as any);

        const { result } = renderHook(() => useCaptureParser(deps));

        // Start session
        act(() => {
            result.current.startSession('shaper_mob_find');
        });

        // Accumulate a few mob find results
        act(() => {
            result.current.accumulateLine('70: orc      : an Ohurk-uai soldier');
            result.current.accumulateLine('71: orc      : a dirty uruk');
            result.current.accumulateLine('502: ratfroth : Ratfroth');
        });

        // Finalize session
        act(() => {
            result.current.finalizeSession();
        });

        // Verify that they were parsed and sent to the store
        expect(mockSetMobilesResult).toHaveBeenCalledWith([
            { vnum: 70, name: 'an Ohurk-uai soldier' },
            { vnum: 71, name: 'a dirty uruk' },
            { vnum: 502, name: 'Ratfroth' }
        ]);
    });

    it('correctly parses object find results from MUME /num o output format', () => {
        const deps = createMockDeps();
        const mockSetObjectsResult = vi.fn();
        
        vi.spyOn(useShaperEntityStore, 'getState').mockReturnValue({
            setObjectsResult: mockSetObjectsResult
        } as any);

        const { result } = renderHook(() => useCaptureParser(deps));

        // Start session
        act(() => {
            result.current.startSession('shaper_obj_find');
        });

        // Accumulate a few object find results
        act(() => {
            result.current.accumulateLine('101: sword    : a long sword');
            result.current.accumulateLine('102: shield   : a metal shield');
        });

        // Finalize session
        act(() => {
            result.current.finalizeSession();
        });

        // Verify that they were parsed and sent to the store
        expect(mockSetObjectsResult).toHaveBeenCalledWith([
            { vnum: 101, name: 'a long sword' },
            { vnum: 102, name: 'a metal shield' }
        ]);
    });

    it('parses live object stats with V-number and Short description labels', () => {
        const deps = createMockDeps();
        const mockSetObjectStatResult = vi.fn();
        
        vi.spyOn(useShaperEntityStore, 'getState').mockReturnValue({
            setObjectStatResult: mockSetObjectStatResult
        } as any);

        const { result } = renderHook(() => useCaptureParser(deps));

        act(() => {
            result.current.startSession('shaper_obj_stat');
            result.current.accumulateLine('Keywords: (the) [canoe], V-number: [9002] Item type: BOAT,');
            result.current.accumulateLine('Short description: a canoe');
            result.current.accumulateLine('Weight: 16.00 kg, Cost: 10 s = 1,000 c, Rent: 5 c/day, Timer: 0,');
            result.current.accumulateLine('Extra flags: none');
        });

        act(() => {
            result.current.finalizeSession();
        });

        expect(mockSetObjectStatResult).toHaveBeenCalledWith(expect.objectContaining({
            vnum: 9002,
            name: 'a canoe',
            type: 'BOAT',
            weight: 16,
            extraFlags: []
        }));
    });

    it('reads wear flags from the real "Can be worn on:" label and Item type', () => {
        const deps = createMockDeps();
        const mockSetObjectStatResult = vi.fn();

        vi.spyOn(useShaperEntityStore, 'getState').mockReturnValue({
            setObjectStatResult: mockSetObjectStatResult
        } as any);

        const { result } = renderHook(() => useCaptureParser(deps));

        // Real /stat o 8002 (a small piece of raw meat) shape from live MUME.
        act(() => {
            result.current.startSession('shaper_obj_stat');
            result.current.accumulateLine('Keywords: (the) [meat small raw piece], V-number: [8002] Item type: FOOD,');
            result.current.accumulateLine('Short description: a small piece of raw meat');
            result.current.accumulateLine('Can be worn on: take');
            result.current.accumulateLine('Extra flags: none');
            result.current.accumulateLine('Weight: 0.76 kg, Cost: 5 c, Rent: 1 c/day, Timer: 0, Drop Timer: 0');
        });

        act(() => {
            result.current.finalizeSession();
        });

        // FOOD (not defaulted) and a TAKE wear flag so it classifies as food, not immobile.
        expect(mockSetObjectStatResult).toHaveBeenCalledWith(expect.objectContaining({
            vnum: 8002,
            type: 'FOOD',
            wearFlags: ['take']
        }));
    });

    it('reads multiple wear locations for equipment (e.g. trousers)', () => {
        const deps = createMockDeps();
        const mockSetObjectStatResult = vi.fn();

        vi.spyOn(useShaperEntityStore, 'getState').mockReturnValue({
            setObjectStatResult: mockSetObjectStatResult
        } as any);

        const { result } = renderHook(() => useCaptureParser(deps));

        act(() => {
            result.current.startSession('shaper_obj_stat');
            result.current.accumulateLine('Keywords: (the) [trousers leather], V-number: [3013] Item type: ARMOR,');
            result.current.accumulateLine('Short description: a pair of soft leather trousers');
            result.current.accumulateLine('Can be worn on: take legs');
            result.current.accumulateLine('Extra flags: none');
        });

        act(() => {
            result.current.finalizeSession();
        });

        expect(mockSetObjectStatResult).toHaveBeenCalledWith(expect.objectContaining({
            vnum: 3013,
            type: 'ARMOR',
            wearFlags: ['take', 'legs']
        }));
    });

    it('correctly parses mobile stats and attributes', () => {
        const deps = createMockDeps();
        const mockSetMobileStatResult = vi.fn();
        
        vi.spyOn(useShaperEntityStore, 'getState').mockReturnValue({
            setMobileStatResult: mockSetMobileStatResult
        } as any);

        const { result } = renderHook(() => useCaptureParser(deps));

        act(() => {
            result.current.startSession('shaper_mob_stat');
            result.current.accumulateLine("Mobile 'a dirty uruk', vnum 71.");
            result.current.accumulateLine("Level: 12  Class: Warrior");
            result.current.accumulateLine("Align: -350");
        });

        act(() => {
            result.current.finalizeSession();
        });

        expect(mockSetMobileStatResult).toHaveBeenCalledWith({
            vnum: 71,
            name: 'a dirty uruk',
            level: 12,
            class: 'Warrior',
            align: -350,
            rawText: "Mobile 'a dirty uruk', vnum 71.\nLevel: 12  Class: Warrior\nAlign: -350"
        });
    });

    it('tolerates leading empty lines and prefix text in stats output', () => {
        const deps = createMockDeps();
        const mockSetMobileStatResult = vi.fn();
        
        vi.spyOn(useShaperEntityStore, 'getState').mockReturnValue({
            setMobileStatResult: mockSetMobileStatResult
        } as any);

        const { result } = renderHook(() => useCaptureParser(deps));

        act(() => {
            result.current.startSession('shaper_mob_stat');
            result.current.accumulateLine('');
            result.current.accumulateLine("Mobile 'an Ohurk-uai soldier', vnum 70.");
            result.current.accumulateLine("Level: 15  Class: Warrior");
        });

        act(() => {
            result.current.finalizeSession();
        });

        expect(mockSetMobileStatResult).toHaveBeenCalledWith(expect.objectContaining({
            vnum: 70,
            name: 'an Ohurk-uai soldier',
            level: 15
        }));
    });

    it('handles not-found errors gracefully by falling back to the command metadata', () => {
        const deps = createMockDeps();
        const mockSetMobileStatResult = vi.fn();
        
        vi.spyOn(useShaperEntityStore, 'getState').mockReturnValue({
            setMobileStatResult: mockSetMobileStatResult
        } as any);

        const { result } = renderHook(() => useCaptureParser(deps));

        // Set pending flags with the command so it gets set in the session metadata
        act(() => {
            result.current.setPendingFlags(true, false, '/stat m 999');
            result.current.startSession('shaper_mob_stat');
            result.current.accumulateLine('No such mobile template.');
        });

        act(() => {
            result.current.finalizeSession();
        });

        expect(mockSetMobileStatResult).toHaveBeenCalledWith({
            vnum: 999,
            name: 'ERROR: Template not found',
            level: 0,
            class: 'UNKNOWN',
            align: 0,
            rawText: 'No such mobile template.'
        });
    });

    it('correctly parses custom bracketed mobile stats format', () => {
        const deps = createMockDeps();
        const mockSetMobileStatResult = vi.fn();
        
        vi.spyOn(useShaperEntityStore, 'getState').mockReturnValue({
            setMobileStatResult: mockSetMobileStatResult
        } as any);

        const { result } = renderHook(() => useCaptureParser(deps));

        act(() => {
            result.current.startSession('shaper_mob_stat');
            result.current.accumulateLine("Id:[1], Instances:[1], Owner:[Manwe]");
            result.current.accumulateLine("Keywords:[Puff dragon], Short desc:[Puff the Fractal Dragon]");
            result.current.accumulateLine("Level:[30], Experience:[20], Money:[none], Alignment:[1000]");
        });

        act(() => {
            result.current.finalizeSession();
        });

        expect(mockSetMobileStatResult).toHaveBeenCalledWith({
            vnum: 1,
            name: 'Puff the Fractal Dragon',
            level: 30,
            class: 'UNKNOWN',
            align: 1000,
            rawText: "Id:[1], Instances:[1], Owner:[Manwe]\nKeywords:[Puff dragon], Short desc:[Puff the Fractal Dragon]\nLevel:[30], Experience:[20], Money:[none], Alignment:[1000]"
        });
    });

    it('correctly parses custom braced mobile stats format', () => {
        const deps = createMockDeps();
        const mockSetMobileStatResult = vi.fn();
        
        vi.spyOn(useShaperEntityStore, 'getState').mockReturnValue({
            setMobileStatResult: mockSetMobileStatResult
        } as any);

        const { result } = renderHook(() => useCaptureParser(deps));

        act(() => {
            result.current.startSession('shaper_mob_stat');
            result.current.accumulateLine("Id:{1}, Instances:[1], Owner:[Manwe]");
            result.current.accumulateLine("Keywords:[Puff dragon], Short desc:[Puff the Fractal Dragon]");
            result.current.accumulateLine("Level:[30], Experience:[20], Money:[none], Alignment:[1000]");
        });

        act(() => {
            result.current.finalizeSession();
        });

        expect(mockSetMobileStatResult).toHaveBeenCalledWith({
            vnum: 1,
            name: 'Puff the Fractal Dragon',
            level: 30,
            class: 'UNKNOWN',
            align: 1000,
            rawText: "Id:{1}, Instances:[1], Owner:[Manwe]\nKeywords:[Puff dragon], Short desc:[Puff the Fractal Dragon]\nLevel:[30], Experience:[20], Money:[none], Alignment:[1000]"
        });
    });

    it('correctly parses mobile info response and updates store', () => {
        const deps = createMockDeps();
        const mockSetMobileInfoResult = vi.fn();
        
        vi.spyOn(useShaperEntityStore, 'getState').mockReturnValue({
            setMobileInfoResult: mockSetMobileInfoResult
        } as any);

        const { result } = renderHook(() => useCaptureParser(deps));

        act(() => {
            result.current.setPendingFlags(true, false, '/info m 1 r');
            result.current.startSession('shaper_mob_info');
            result.current.accumulateLine("Puff is a friendly fractal dragon who loves higher realities.");
            result.current.accumulateLine("He is often found in the Corner Zone.");
        });

        act(() => {
            result.current.finalizeSession();
        });

        expect(mockSetMobileInfoResult).toHaveBeenCalledWith(
            1,
            "Puff is a friendly fractal dragon who loves higher realities.\nHe is often found in the Corner Zone."
        );
    });
});
