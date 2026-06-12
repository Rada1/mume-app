/**
 * @file CaptureMiddleware.test.ts
 * @description Tests archive command capture classification.
 */

import { describe, expect, it, vi } from 'vitest';
import { useArchiveStore } from '../../../../stores/useArchiveStore';
import { CaptureMiddleware } from '../CaptureMiddleware';

const createContext = () => ({
    captureStage: { current: 'none' },
    setPendingFlags: vi.fn(),
    executeCommand: vi.fn(),
    setStatsLines: vi.fn(),
    setInfoLines: vi.fn(),
    setAchievementLines: vi.fn(),
    setScoreLines: vi.fn(),
    finalizeCapture: vi.fn()
});

describe('CaptureMiddleware', () => {
    it('classifies look mail sent as sent mail capture', () => {
        const context = createContext();
        useArchiveStore.getState().setPanelMode('board');
        useArchiveStore.getState().setActiveView('mail-inbox');

        const result = CaptureMiddleware('look mail sent', context as any, {
            silent: false,
            isSystem: false,
            fromDrawer: false
        });

        expect(result).toBeNull();
        expect(context.captureStage.current).toBe('mail_list');
        expect(useArchiveStore.getState().panelMode).toBe('mail');
        expect(useArchiveStore.getState().activeView).toBe('mail-sent');
        expect(context.executeCommand).toHaveBeenCalledWith('look mail sent', true, false, false, false);
    });

    it('classifies shaper /num and /stat commands correctly', () => {
        const context = createContext();

        CaptureMiddleware('/num m orc', context as any, { silent: true, isSystem: false, fromDrawer: false });
        expect(context.captureStage.current).toBe('shaper_mob_find');

        CaptureMiddleware('/num o sword', context as any, { silent: true, isSystem: false, fromDrawer: false });
        expect(context.captureStage.current).toBe('shaper_obj_find');

        CaptureMiddleware('/stat m 70', context as any, { silent: true, isSystem: false, fromDrawer: false });
        expect(context.captureStage.current).toBe('shaper_mob_stat');

        CaptureMiddleware('/stat o 101', context as any, { silent: true, isSystem: false, fromDrawer: false });
        expect(context.captureStage.current).toBe('shaper_obj_stat');
    });
});
