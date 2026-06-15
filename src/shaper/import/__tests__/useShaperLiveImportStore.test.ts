/**
 * @file useShaperLiveImportStore.test.ts
 * @description Tests the live-import output collector's boundary handling.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { useShaperLiveImportStore } from '../useShaperLiveImportStore';

const reset = () => {
    useShaperLiveImportStore.getState().clearWaiters();
    useShaperLiveImportStore.getState().setImporting(false);
};

// --- Test Section ---
describe('useShaperLiveImportStore collector', () => {
    beforeEach(reset);

    it('ignores /at teleport movement and leading prompts, resolving on the prompt after content', async () => {
        const store = useShaperLiveImportStore.getState();
        const promise = store.waitForCommand('/at 31:5 /com list -commands');

        // `/at` teleport noise arrives first and must be ignored.
        store.collectLine('<movement/', false);
        store.collectLine('*f C iMw NN NS 3100[31:0]', true); // leading prompt, no content yet
        // Real output.
        store.collectLine('/com add mob 1599 10100', false);
        store.collectLine('*f C iMw NN NS 3100[31:0]', true); // terminating prompt

        const result = await promise;
        expect(result.output).toBe('/com add mob 1599 10100');
    });

    it('collects the usage menu for an empty room without hanging', async () => {
        const store = useShaperLiveImportStore.getState();
        const promise = store.waitForCommand('/at 31:7 /com list -commands');

        store.collectLine('<movement/', false);
        store.collectLine('       list', false);
        store.collectLine('       add <command name> [<argument> <value>...]', false);
        store.collectLine('*f C iMw NN NS 3100[31:0]', true);

        const result = await promise;
        expect(result.output).toContain('list');
        expect(result.output).not.toContain('movement');
    });

    it('preserves empty lines after live-read content begins', async () => {
        const store = useShaperLiveImportStore.getState();
        const promise = store.waitForCommand('/info z 31 asciimap r');

        store.collectLine('', false);
        store.collectLine('Key', false);
        store.collectLine('', false);
        store.collectLine('> = mountains', false);
        store.collectLine('', false);
        store.collectLine('        15', false);
        store.collectLine('*f C iMw NN NS 3100[31:0]', true);

        const result = await promise;
        expect(result.output).toBe('Key\n\n> = mountains\n\n        15');
    });

    it('ignores session finalizes (receiveCapture) while importing', () => {
        const store = useShaperLiveImportStore.getState();
        store.setImporting(true);
        let resolved = false;
        store.waitForCommand('/at 31:5 /com list -commands').then(() => { resolved = true; });
        store.receiveCapture({ type: 'shaper_live_com_list', command: '/at 31:5 /com list -commands', output: 'junk' });
        expect(resolved).toBe(false);
    });
});
