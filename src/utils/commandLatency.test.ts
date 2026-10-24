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
    expect(commandLatency.getSnapshot()).toEqual({last: null, count: 0, skipped: 0});
});
