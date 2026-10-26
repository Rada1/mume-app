/** @file commandLatency.test.ts — Isolated reply attribution and end-to-end stage timings. */
// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { commandLatency } from './commandLatency';

// --- Timing Checks ---
afterEach(() => { commandLatency.enabled = false; vi.restoreAllMocks(); });

it('measures input, send, first text and the matching log commit without counting other rows', () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    commandLatency.enabled = true;
    document.dispatchEvent(new Event('pointerdown'));
    now = 120; commandLatency.recordSend(true);
    now = 820; commandLatency.recordText();
    now = 830; commandLatency.recordText();
    commandLatency.recordOutput('reply');
    commandLatency.recordCommit('command-echo');
    expect(commandLatency.getSnapshot().count).toBe(0);
    now = 900; commandLatency.recordCommit('reply');
    expect(commandLatency.getSnapshot()).toMatchObject({count: 1, last: {
        pressToSendMs: 120, sendToTextMs: 700, textToCommitMs: 80, pressToCommitMs: 900}});
});

it('discards overlapping commands until their prompt boundaries clear', () => {
    commandLatency.enabled = true;
    commandLatency.recordInput(); commandLatency.recordSend(true);
    commandLatency.recordSend(true);
    commandLatency.recordText(); commandLatency.recordOutput('ambiguous'); commandLatency.recordCommit('ambiguous');
    expect(commandLatency.getSnapshot()).toMatchObject({count: 0, skipped: 1});
    commandLatency.recordPrompt(); commandLatency.recordPrompt();
    commandLatency.recordInput(); commandLatency.recordSend(true);
    commandLatency.recordText(); commandLatency.recordOutput('isolated'); commandLatency.recordCommit('isolated');
    expect(commandLatency.getSnapshot().count).toBe(1);
});

it('tracks silent commands for ordering but excludes them from user reply samples', () => {
    commandLatency.enabled = true;
    commandLatency.recordSend(false); commandLatency.recordText();
    commandLatency.recordOutput('silent'); commandLatency.recordCommit('silent'); commandLatency.recordPrompt();
    expect(commandLatency.getSnapshot().count).toBe(0);
    commandLatency.recordSend(true); commandLatency.recordText(); commandLatency.recordOutput('reply'); commandLatency.recordCommit('reply');
    expect(commandLatency.getSnapshot().last?.pressToCommitMs).toBeNull();
    commandLatency.reset();
    expect(commandLatency.getSnapshot()).toEqual({last: null, count: 0, skipped: 0,
        dispatch: {lastMs: null, maxMs: null, count: 0}});
});

it('retains the slow first dispatch when later burst replies cannot be attributed', () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    commandLatency.enabled = true;
    commandLatency.recordInput();
    now = 900; commandLatency.recordSend(true);
    now = 910; commandLatency.recordInput();
    now = 925; commandLatency.recordSend(true);
    commandLatency.recordText(); commandLatency.recordOutput('burst'); commandLatency.recordCommit('burst');
    expect(commandLatency.getSnapshot()).toMatchObject({count: 0, skipped: 1,
        dispatch: {lastMs: 15, maxMs: 900, count: 2}});
    commandLatency.recordInput();
    now = 950; commandLatency.recordSend(false);
    commandLatency.recordSend(true); // No fresh input: do not reuse an earlier tap.
    expect(commandLatency.getSnapshot().dispatch).toEqual({lastMs: 15, maxMs: 900, count: 2});
});
