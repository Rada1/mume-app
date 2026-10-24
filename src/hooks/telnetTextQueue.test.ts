/** @file telnetTextQueue.test.ts — Guards responsive, ordered reply handling. */
// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { processIncomingTextChunk } from './telnetTextQueue';
import { parserWorkerClient } from '../services/parser/parserWorkerClient';
import { perfMonitor } from '../utils/perfMonitor';
import { PipelineOrchestrator } from '../services/parser/PipelineOrchestrator';

// --- Reply Scheduling Checks ---
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); perfMonitor.enabled = false; perfMonitor.resetPeaks(); });

it('yields between expensive short-reply lines and preserves prompt flags and shared effects', async () => {
    vi.useFakeTimers();
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const worker = vi.spyOn(parserWorkerClient, 'tokenize');
    const received: string[] = [];
    const effects: Set<string>[] = [];
    const processing = processIncomingTextChunk(['Room', 'Description', {line: '>', isPrompt: true, isRedrawPrompt: true}], () => ({}),
        (line, tokens, chunkEffects) => {
            received.push(line);
            effects.push(chunkEffects!);
            if (line === '>') expect(tokens).toMatchObject({isPrompt: true, isRedrawPrompt: true});
            now += 10;
        }, false);
    expect(received).toEqual(['Room']);
    await vi.runAllTimersAsync();
    await processing;
    expect(received).toEqual(['Room', 'Description', '>']);
    expect(new Set(effects).size).toBe(1);
    expect(worker).not.toHaveBeenCalled();
});

it('keeps cheap short replies synchronous without scheduling timers', async () => {
    vi.useFakeTimers();
    vi.spyOn(performance, 'now').mockReturnValue(0);
    const received: string[] = [];
    const processing = processIncomingTextChunk(['first', 'second'], () => ({}), line => received.push(line), false);
    expect(received).toEqual(['first', 'second']);
    expect(vi.getTimerCount()).toBe(0);
    await processing;
});

it('preserves line order when worker tokenization fails during a large reply', async () => {
    vi.spyOn(parserWorkerClient, 'tokenize').mockRejectedValue(new Error('unavailable'));
    const lines = Array.from({length: 30}, (_, index) => `line ${index}`);
    const received: string[] = [];
    await processIncomingTextChunk(lines, () => ({}), line => received.push(line), false);
    expect(received).toEqual(lines);
});

it('measures direct tokenization and line handlers and clears their samples on reset', async () => {
    perfMonitor.enabled = true;
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const ingest = PipelineOrchestrator.ingestChunk;
    vi.spyOn(PipelineOrchestrator, 'ingestChunk').mockImplementation((...args) => {
        ingest.apply(PipelineOrchestrator, args);
        now += 3;
    });
    await processIncomingTextChunk(['reply'], () => ({}), () => { now += 5; }, false);
    expect(perfMonitor.getSnapshot().parserSyncMaxMs).toBe(3);
    expect(perfMonitor.getSnapshot().lineHandlingMaxMs).toBe(5);
    perfMonitor.resetPeaks();
    expect(perfMonitor.getSnapshot().lineHandlingMaxMs).toBe(0);
    expect(perfMonitor.getSnapshot().parserSyncMaxMs).toBe(0);
});
