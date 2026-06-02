/**
 * @file playerMoveAnimator.test.ts
 * @description Validates the optimistic move animator:
 *   - a move glides (over ~latency) toward the predicted room rather than snapping
 *   - spammed moves queue and chain through rooms in order (no teleport-ahead)
 *   - a confirm advances the last-confirmed room without snapping the glide
 *   - a failure bounces back to the last confirmed room
 *   - stray failures / duplicate confirms are harmless
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
    createMoveAnimState, optimisticMove, settle, failMove, bumpWall, advanceMoveAnim,
    MOVE_ANIM, type Vec3, type MoveAnimState,
} from '../playerMoveAnimator';

const v = (x: number, y: number, z = 0): Vec3 => ({ x, y, z });
const L = MOVE_ANIM.GLIDE_MS;

/** Drive frames until idle, advancing the mocked clock by `stepMs` each frame. */
const runGlide = (s: MoveAnimState, render: Vec3, stepMs = 16, maxFrames = 2000): Vec3[] => {
    const path: Vec3[] = [];
    for (let i = 0; i < maxFrames; i++) {
        vi.advanceTimersByTime(stepMs);
        const more = advanceMoveAnim(s, render, stepMs / 16.67);
        path.push({ ...render });
        if (!more) break;
    }
    return path;
};

describe('playerMoveAnimator', () => {
    beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(0); });
    afterEach(() => { vi.useRealTimers(); });

    it('glides toward the predicted room rather than snapping', () => {
        const s = createMoveAnimState();
        const render = v(0, 0);
        optimisticMove(s, render, v(1, 0));
        // Immediately after the command the marker has NOT teleported.
        expect(render.x).toBeLessThan(0.2);
        // Partway through the latency window it is mid-glide.
        vi.advanceTimersByTime(L / 2);
        advanceMoveAnim(s, render, 1);
        expect(render.x).toBeGreaterThan(0.2);
        expect(render.x).toBeLessThan(0.95);
        // It finishes at the room.
        runGlide(s, render);
        expect(render.x).toBeCloseTo(1, 3);
    });

    it('honors a calibrated per-move glide duration', () => {
        const s = createMoveAnimState();
        const render = v(0, 0);
        optimisticMove(s, render, v(1, 0), 100); // calibrated to 100ms
        expect(s.glideMs).toBe(100);
        // Not done at 60ms, done by ~110ms.
        vi.advanceTimersByTime(60);
        expect(advanceMoveAnim(s, render, 1)).toBe(true);
        expect(render.x).toBeLessThan(1);
        vi.advanceTimersByTime(60);
        advanceMoveAnim(s, render, 1);
        expect(render.x).toBeCloseTo(1, 3);
    });

    it('caps the marker at one room ahead — spam waits for confirms, then advances', () => {
        const s = createMoveAnimState();
        const render = v(0, 0);
        // Spam four steps east before anything resolves.
        optimisticMove(s, render, v(1, 0));
        optimisticMove(s, render, v(2, 0));
        optimisticMove(s, render, v(3, 0));
        optimisticMove(s, render, v(4, 0));
        expect(s.inFlight).toBe(4);

        // With no confirms, it glides into room 1 (the one step you took) and HOLDS —
        // never racing ahead to room 4.
        runGlide(s, render);
        expect(s.phase).toBe('waiting');
        expect(render.x).toBeCloseTo(1, 2);

        // Each confirm releases exactly one more room.
        settle(s, render, v(1, 0));
        runGlide(s, render);
        expect(render.x).toBeCloseTo(2, 2);
        expect(s.phase).toBe('waiting');

        settle(s, render, v(2, 0));
        runGlide(s, render);
        expect(render.x).toBeCloseTo(3, 2);

        settle(s, render, v(3, 0));
        runGlide(s, render);
        expect(render.x).toBeCloseTo(4, 2); // last segment needs no gate
    });

    it('advances last-confirmed on confirm without snapping the glide', () => {
        const s = createMoveAnimState();
        const render = v(0, 0);
        optimisticMove(s, render, v(1, 0));
        optimisticMove(s, render, v(2, 0)); // two in flight
        vi.advanceTimersByTime(20);
        advanceMoveAnim(s, render, 1);
        const xBefore = render.x;

        settle(s, render, v(1, 0)); // first move confirms
        expect(s.lastConfirmed).toMatchObject({ x: 1, y: 0 });
        expect(s.inFlight).toBe(1);
        expect(render.x).toBeCloseTo(xBefore, 5); // glide not snapped/jumped
    });

    it('bounces back to the last confirmed room on failure', () => {
        const s = createMoveAnimState();
        const render = v(0, 0);
        optimisticMove(s, render, v(1, 0)); // step 1 (will succeed)
        optimisticMove(s, render, v(2, 0)); // step 2 (will fail)
        settle(s, render, v(1, 0));          // step 1 confirmed → lastConfirmed = (1,0)
        runGlide(s, render);                    // glide out toward (2,0)
        expect(render.x).toBeGreaterThan(1.2);

        failMove(s); // step 2 hits a wall
        expect(s.phase).toBe('bouncing');
        const path = runGlide(s, render);
        // Recoils to the confirmed room (1,0), overshooting it slightly first.
        expect(Math.min(...path.map(p => p.x))).toBeLessThan(1);
        expect(render.x).toBeCloseTo(1, 3);
    });

    it('ignores a stray failure when nothing is in flight', () => {
        const s = createMoveAnimState();
        const render = v(0, 0);
        optimisticMove(s, render, v(1, 0));
        settle(s, render, v(1, 0));
        runGlide(s, render);
        expect(s.inFlight).toBe(0);

        failMove(s); // unrelated failure line
        expect(s.phase).toBe('idle');
        expect(render.x).toBeCloseTo(1, 3);
    });

    it('keeps a 3-move chain intact when duplicate confirms arrive mid-glide (w s w)', () => {
        const s = createMoveAnimState();
        const render = v(0, 0);
        // Spam w s w: (0,0) → (-1,0) → (-1,1) → (-2,1).
        optimisticMove(s, render, v(-1, 0));
        optimisticMove(s, render, v(-1, 1));
        optimisticMove(s, render, v(-2, 1));
        expect(s.inFlight).toBe(3);
        expect(s.queue.length).toBe(3);

        // Mid-glide, the first move confirms via GMCP *and* a duplicate XML packet.
        vi.advanceTimersByTime(25);
        advanceMoveAnim(s, render, 1);
        settle(s, render, v(-1, 0)); // GMCP
        settle(s, render, v(-1, 0)); // XML duplicate — must NOT rebase the queue
        expect(s.inFlight).toBe(2);
        expect(s.queue.length).toBe(3); // remaining path intact (the bug collapsed this to 1)

        // Remaining confirms (+duplicates) trickle in as the glide plays out.
        settle(s, render, v(-1, 1)); settle(s, render, v(-1, 1));
        settle(s, render, v(-2, 1)); settle(s, render, v(-2, 1));
        const path = runGlide(s, render);

        // Walked the L-shaped chain through the intermediate rooms, ending at (-2,1).
        expect(path.some(p => Math.abs(p.x - -1) < 0.15 && Math.abs(p.y - 0) < 0.15)).toBe(true);
        expect(path.some(p => Math.abs(p.x - -1) < 0.15 && Math.abs(p.y - 1) < 0.15)).toBe(true);
        expect(render.x).toBeCloseTo(-2, 2);
        expect(render.y).toBeCloseTo(1, 2);
    });

    it('flows straight through (no waiting) when confirms have run ahead', () => {
        const s = createMoveAnimState();
        const render = v(0, 0);
        optimisticMove(s, render, v(1, 0));
        optimisticMove(s, render, v(2, 0));
        optimisticMove(s, render, v(3, 0));
        // Server confirms all three up front (faster than the glide).
        settle(s, render, v(1, 0));
        settle(s, render, v(2, 0));
        settle(s, render, v(3, 0));

        const path = runGlide(s, render);
        // All rooms already confirmed → never gates; walks straight to room 3.
        expect(path.some(p => p.x > 0.8 && p.x < 1.2)).toBe(true);
        expect(path.some(p => p.x > 1.8 && p.x < 2.2)).toBe(true);
        expect(render.x).toBeCloseTo(3, 2);
        expect(s.phase).toBe('idle');
    });

    it('reconciles to truth if the gate wait times out', () => {
        const s = createMoveAnimState();
        const render = v(0, 0);
        optimisticMove(s, render, v(1, 0));
        optimisticMove(s, render, v(2, 0));
        runGlide(s, render);                 // into room1, then waits (no confirm)
        expect(s.phase).toBe('waiting');
        vi.advanceTimersByTime(MOVE_ANIM.WAIT_TIMEOUT_MS + 50);
        advanceMoveAnim(s, render, 1);       // timeout → reconcile to last confirmed (room0)
        expect(s.phase).toBe('idle');
        expect(render.x).toBeCloseTo(0, 3);
    });

    it('bumps the wall at the END of a spam chain (not just from a standstill)', () => {
        const s = createMoveAnimState();
        const render = v(0, 0);
        optimisticMove(s, render, v(1, 0)); // valid
        optimisticMove(s, render, v(2, 0)); // valid
        bumpWall(s, render, v(1, 0));        // 3rd command runs into a wall to the east
        expect(s.queue.length).toBe(2);      // bumps aren't queued segments…
        expect(s.pendingBump).not.toBeNull(); // …they're deferred until the chain lands
        settle(s, render, v(1, 0));
        settle(s, render, v(2, 0));

        const path = runGlide(s, render);
        // Glides to room 2, then leans east past it (the bump) and returns to exactly (2,0).
        const maxX = Math.max(...path.map(p => p.x));
        expect(maxX).toBeGreaterThan(2.05);
        expect(maxX).toBeLessThan(2.5);
        expect(render.x).toBeCloseTo(2, 2);
        expect(render.y).toBeCloseTo(0, 2);
    });

    it('repeated wall spam keeps bumping in place (each press re-leans)', () => {
        const s = createMoveAnimState();
        const render = v(0, 0);
        bumpWall(s, render, v(1, 0));
        vi.advanceTimersByTime(MOVE_ANIM.GLIDE_MS / 2);
        advanceMoveAnim(s, render, 1);
        expect(render.x).toBeGreaterThan(0.05); // first bump leans east
        // let it finish
        vi.advanceTimersByTime(MOVE_ANIM.GLIDE_MS);
        advanceMoveAnim(s, render, 1);
        expect(s.phase).toBe('idle');
        expect(render.x).toBeCloseTo(0, 3);
        // a second wall press bumps again (subsequent bumps must still show)
        bumpWall(s, render, v(1, 0));
        expect(s.phase).toBe('bumping');
        vi.advanceTimersByTime(MOVE_ANIM.GLIDE_MS / 2);
        advanceMoveAnim(s, render, 1);
        expect(render.x).toBeGreaterThan(0.05);
    });

    it('a valid move after wall spam glides cleanly — no stale bump replays first', () => {
        const s = createMoveAnimState();
        const render = v(0, 0);
        // Spam east into a wall a few times, animating partway each (marker leans east).
        bumpWall(s, render, v(1, 0));
        vi.advanceTimersByTime(40); advanceMoveAnim(s, render, 1);
        bumpWall(s, render, v(1, 0));
        vi.advanceTimersByTime(40); advanceMoveAnim(s, render, 1);
        expect(s.queue.length).toBe(0); // bumps never entered the move queue

        // Now a valid move NORTH — must glide straight there, never re-leaning east.
        optimisticMove(s, render, v(0, -1));
        const path = runGlide(s, render);
        expect(Math.max(...path.map(p => p.x))).toBeLessThan(0.1); // no eastward bump
        expect(render.x).toBeCloseTo(0, 2);
        expect(render.y).toBeCloseTo(-1, 2);
    });

    it('does not bounce on an expected (known-wall) failure', () => {
        const s = createMoveAnimState();
        const render = v(0, 0);
        bumpWall(s, render, v(1, 0)); // known wall queued
        failMove(s);                  // server's "can't go that way" arrives
        expect(s.phase).toBe('bumping'); // still bumping, not bouncing
        runGlide(s, render);
        expect(render.x).toBeCloseTo(0, 3);
    });

    it('bumps into a wall and returns to origin without leaving the room', () => {
        const s = createMoveAnimState();
        const render = v(0, 0);
        bumpWall(s, render, v(1, 0)); // wall to the east
        expect(s.phase).toBe('bumping');

        const path = runGlide(s, render);
        // Leans toward the wall (east, +x) at some point, but never a full room.
        const maxX = Math.max(...path.map(p => p.x));
        expect(maxX).toBeGreaterThan(0.05);
        expect(maxX).toBeLessThan(0.5);
        // Returns exactly to the origin room and never enters the wall room.
        expect(render.x).toBeCloseTo(0, 4);
        expect(render.y).toBeCloseTo(0, 4);
        expect(s.inFlight).toBe(0);
    });

    it('treats a duplicate confirm as a no-op', () => {
        const s = createMoveAnimState();
        const render = v(0, 0);
        optimisticMove(s, render, v(1, 0));
        settle(s, render, v(1, 0));
        runGlide(s, render);
        const x = render.x;
        settle(s, render, v(1, 0)); // duplicate (GMCP + XML)
        expect(render.x).toBeCloseTo(x, 5);
        expect(s.inFlight).toBe(0);
    });
});
