/**
 * @file playerMoveAnimator.ts
 * @description Optimistic movement for the player marker.
 *
 * The marker moves optimistically the instant a command is sent, but as a timed glide
 * whose duration tracks how long the game actually takes to respond (a rolling average
 * of move command → confirmation latency, fed in by MapperContext). So a single step
 * glides over ~one round-trip and tends to arrive just as the server confirms.
 *
 * Spammed moves QUEUE and chain at that pace instead of teleporting the tile rooms
 * ahead of reality; when the backlog grows the glide speeds up to catch up. Each server
 * confirmation advances the "last confirmed" room. If a move fails, the marker springs
 * back to that last confirmed room (the wall it bounced off), discarding the rest of
 * the optimistic queue.
 *
 * The animator owns the *render* position (playerPosRef). The confirmed truth lives in
 * MapperContext's room state; this module only controls how the marker travels there.
 */

export type MovePhase = 'idle' | 'gliding' | 'bouncing' | 'bumping' | 'waiting';

export interface Vec3 { x: number; y: number; z: number; }

interface Segment {
    from: Vec3;
    to: Vec3;
}

export interface MoveAnimState {
    phase: MovePhase;
    /** Pending optimistic segments to glide through, in order. */
    queue: Segment[];
    /** Wall-clock start of the active segment (queue[0]). */
    glideStart: number;
    /** Duration of the active segment (ms). */
    glideDur: number;
    /** Last server-confirmed room — bounce anchor + drift reference. */
    lastConfirmed: Vec3 | null;
    /** Optimistic moves sent but not yet confirmed/failed. */
    inFlight: number;
    /** Per-move glide duration (ms). Calibrated once to the user's link; default GLIDE_MS. */
    glideMs: number;
    /** Bounce velocity (world units / frame). */
    vx: number;
    vy: number;
    /** Wall-bump (in-place, NOT a queue segment): room we bumped from + dir toward blocker. */
    bumpOrigin: Vec3 | null;
    bumpVec: Vec3 | null;
    /** A bump requested while a glide chain is animating — plays once the chain lands. */
    pendingBump: Vec3 | null;
    /** Confirmation gate: while 'waiting', the room we left to reach where we're parked.
     *  We resume once the server's confirmed room moves off it (our step got confirmed). */
    waitFrom: Vec3 | null;
}

// --- Tuning ---------------------------------------------------------------
export const MOVE_ANIM = {
    /** Fixed glide duration for a single move (ms). */
    GLIDE_MS: 200,
    /** How far (room units) the marker leans toward a known wall before recoiling. */
    BUMP_DIST: 0.28,
    /**
     * Easing linear-fraction. ease(t) = MIX*t + (1-MIX)*t² → starts promptly (non-zero
     * velocity), accelerates, finishes briskly with NO ease-out tail (so the marker
     * doesn't crawl the last bit into the room, and doesn't reach it early either).
     * 1 = linear, 0 = pure quadratic ease-in.
     */
    EASE_LINEAR_MIX: 0.4,
    /** Shortest a single glide segment may be once sped up to catch up (ms). */
    MIN_SEGMENT_MS: 35,
    /** If the marker is more than this many rooms BEHIND confirmed truth, it speeds up. */
    CATCHUP_AT: 1.5,
    /** Max catch-up speed multiplier when far behind confirmed truth. */
    CATCHUP_MAX: 3,
    /** Give up waiting for a confirm after this long and reconcile to truth (ms). */
    WAIT_TIMEOUT_MS: 2500,
    /** Confirmed-room drift beyond this (rooms) forces a hard resync snap. */
    RESYNC_DIST: 3.5,
    /** A forced/external room change farther than this (rooms) snaps instead of gliding. */
    FORCED_GLIDE_MAX: 2.5,
    /** Bounce spring stiffness (recoil toward the last confirmed room). */
    BOUNCE_K: 0.5,
    /** Bounce damping (< 1 → under-damped → overshoot jiggle). */
    BOUNCE_DAMP: 0.66,
    /** z (floor) lerp retention during a bounce. */
    Z_BASE: 0.74,
    /** World distance + velocity under which a bounce is considered at rest. */
    REST_EPS: 0.012,
} as const;

export const createMoveAnimState = (): MoveAnimState => ({
    phase: 'idle',
    queue: [],
    glideStart: 0,
    glideDur: MOVE_ANIM.GLIDE_MS,
    lastConfirmed: null,
    inFlight: 0,
    glideMs: MOVE_ANIM.GLIDE_MS,
    vx: 0,
    vy: 0,
    bumpOrigin: null,
    bumpVec: null,
    pendingBump: null,
    waitFrom: null,
});

const dist2d = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y);
// Prompt start, brisk finish, no ease-out tail. See EASE_LINEAR_MIX.
const ease = (t: number) => MOVE_ANIM.EASE_LINEAR_MIX * t + (1 - MOVE_ANIM.EASE_LINEAR_MIX) * t * t;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Begin gliding the head queue segment. */
const startSegment = (s: MoveAnimState) => {
    const seg = s.queue[0];
    if (!seg) { s.phase = 'idle'; return; }
    s.glideStart = Date.now();
    // Catch-up: only speed up when the marker is BEHIND confirmed truth (confirms outpaced
    // the glide). The gate keeps us from ever being ahead, so the distance from this
    // segment's start to lastConfirmed is "how far behind reality we are".
    const behind = s.lastConfirmed ? dist2d(seg.from, s.lastConfirmed) : 0;
    const speed = behind > MOVE_ANIM.CATCHUP_AT ? Math.min(MOVE_ANIM.CATCHUP_MAX, behind) : 1;
    s.glideDur = Math.max(MOVE_ANIM.MIN_SEGMENT_MS, s.glideMs / speed);
    s.phase = 'gliding';
};

/** Start (or restart) an in-place wall-bump from `at`, leaning toward `dirVec`. */
const startBump = (s: MoveAnimState, at: Vec3, dirVec: Vec3) => {
    s.bumpOrigin = { x: at.x, y: at.y, z: at.z };
    s.bumpVec = { x: dirVec.x, y: dirVec.y, z: 0 };
    s.glideStart = Date.now();
    s.glideDur = s.glideMs;
    s.phase = 'bumping';
    s.pendingBump = null;
};

/**
 * The head item just finished (the marker entered `completedFrom`'s destination). Decide
 * what's next: advance to the queued segment, or — if the move we just played hasn't been
 * confirmed yet — WAIT here so we never get more than one room ahead of the server.
 */
const advanceQueue = (s: MoveAnimState, render: Vec3, completedFrom: Vec3): boolean => {
    s.queue.shift();
    if (s.queue.length === 0) {
        // Chain done. If everything confirmed and truth differs from prediction, reconcile.
        if (s.inFlight === 0 && s.lastConfirmed && dist2d(render, s.lastConfirmed) > 0.1) {
            render.x = s.lastConfirmed.x;
            render.y = s.lastConfirmed.y;
            render.z = s.lastConfirmed.z;
        }
        // A wall-bump requested mid-chain (e.g. spam ending in a wall) plays now, from here.
        if (s.pendingBump) {
            startBump(s, render, s.pendingBump);
            return true;
        }
        s.phase = 'idle';
        return false;
    }
    // Confirmation gate: if the server's confirmed room is still the room we just LEFT,
    // the step we optimistically took isn't confirmed — hold here until it is. (If
    // lastConfirmed has moved off it, either our step confirmed or we're behind: proceed.)
    if (s.lastConfirmed && dist2d(s.lastConfirmed, completedFrom) < 0.5) {
        s.phase = 'waiting';
        s.waitFrom = { ...completedFrom };
        s.glideStart = Date.now(); // reused as wait-start for the timeout
        return false;
    }
    startSegment(s);
    return true;
};

/** While 'waiting', try to resume: the server's confirmed room moved off where we left. */
const tryResumeFromWait = (s: MoveAnimState): boolean => {
    if (s.phase !== 'waiting' || s.queue.length === 0) return false;
    if (s.waitFrom && s.lastConfirmed && dist2d(s.lastConfirmed, s.waitFrom) < 0.5) return false;
    s.waitFrom = null;
    startSegment(s);
    return true;
};

/**
 * Optimistically move toward the predicted room as a fixed-duration glide. Multiple
 * calls queue and chain. Mutates state (render is advanced each frame).
 */
export const optimisticMove = (s: MoveAnimState, render: Vec3, predicted: Vec3, glideMs?: number) => {
    if (glideMs != null) s.glideMs = glideMs;
    // A real move supersedes any wall-bump feedback: drop a queued bump, and if one is
    // currently playing, un-lean back to its room so the glide starts cleanly (not from
    // the mid-lean offset). This is what stops a stale bounce playing before a valid move.
    s.pendingBump = null;
    if (s.phase === 'bumping') {
        if (s.bumpOrigin) { render.x = s.bumpOrigin.x; render.y = s.bumpOrigin.y; render.z = s.bumpOrigin.z; }
        s.phase = 'idle';
    }
    const fresh = s.inFlight === 0 && s.queue.length === 0;
    const from = s.queue.length ? s.queue[s.queue.length - 1].to : { x: render.x, y: render.y, z: render.z };
    if (fresh) {
        // Start of a chain: anchor the bounce/truth at the room we're leaving.
        s.lastConfirmed = { x: render.x, y: render.y, z: render.z };
        s.vx = 0;
        s.vy = 0;
    }
    s.queue.push({ from: { ...from }, to: { ...predicted } });
    s.inFlight++;
    // Only kick off from a resting state; if already gliding/waiting, the queue + gate
    // machinery handles progression (and must not be short-circuited).
    if (s.phase === 'idle' || s.phase === 'bouncing') startSegment(s);
};

/**
 * The server settled us in `target`. While an optimistic glide/bump/bounce is animating
 * we only RECORD truth (the animation stays authoritative) — never rebase mid-chain, or
 * a duplicate/early confirm would discard the rest of a spammed path. Reconciliation to
 * truth happens when the chain finishes (see advanceMoveAnim). With nothing animating,
 * this is a forced/external move (follow, recall, …) — glide there if near, else snap.
 */
export const settle = (s: MoveAnimState, render: Vec3, target: Vec3) => {
    // Duplicate confirmation — lit rooms fire GMCP *and* XML for the same move, often mid
    // glide. Always ignore a confirm for the room we last confirmed, in any phase.
    if (s.lastConfirmed && dist2d(s.lastConfirmed, target) < 0.5) return;

    // This confirm matches an optimistic move we already played/are playing — just record
    // truth and return. Critically, NEVER fall through to the forced-move glide: if the
    // glide already finished (idle) while confirms lag behind, a late confirm for an
    // earlier room must not drag the marker backward.
    if (s.inFlight > 0) {
        s.inFlight--;
        s.lastConfirmed = { ...target };
        // The confirm caught up — if we were holding at the gate, resume the chain.
        tryResumeFromWait(s);
        // Last outstanding move just confirmed and the glide already finished: reconcile.
        if (s.inFlight === 0 && s.phase === 'idle' && s.queue.length === 0 && dist2d(render, target) > 0.1) {
            render.x = target.x; render.y = target.y; render.z = target.z;
        }
        return;
    }

    s.lastConfirmed = { ...target };
    tryResumeFromWait(s);

    // A glide/wait chain is animating — keep it authoritative.
    if ((s.phase !== 'idle' && s.phase !== 'bumping') || s.queue.length > 0) return;

    // Idle, or merely bumping in place (a real room change overrides the bump): treat as a
    // forced/external move (follow, recall, or the block prediction was wrong) — glide
    // there if near, else snap.
    s.pendingBump = null;
    if (s.phase === 'bumping' && s.bumpOrigin) { render.x = s.bumpOrigin.x; render.y = s.bumpOrigin.y; render.z = s.bumpOrigin.z; s.phase = 'idle'; }
    const d = dist2d(render, target);
    if (d < 1e-3) return;
    if (d <= MOVE_ANIM.FORCED_GLIDE_MAX) {
        s.queue = [{ from: { x: render.x, y: render.y, z: render.z }, to: { ...target } }];
        startSegment(s);
    } else {
        s.queue = [];
        render.x = target.x; render.y = target.y; render.z = target.z;
        s.phase = 'idle';
    }
};

/**
 * Lean-into-and-recoil bump against a known wall/closed exit (we never leave the room).
 * In-place — NOT a queue segment. While idle (or already bumping) it plays/restarts right
 * away from the current room; spamming into a wall re-triggers the lean each press. While
 * a glide chain is animating it's deferred (pendingBump) and plays once the chain lands —
 * e.g. a spam that ends in a wall.
 */
export const bumpWall = (s: MoveAnimState, render: Vec3, dirVec: Vec3, glideMs?: number) => {
    if (glideMs != null) s.glideMs = glideMs;
    if (s.phase === 'gliding' || s.phase === 'waiting') {
        s.pendingBump = { x: dirVec.x, y: dirVec.y, z: 0 };
        return;
    }
    // idle / bouncing → fresh bump from where we are; bumping → restart from the same room
    // (keep the existing origin, don't anchor to the mid-lean offset).
    const at = (s.phase === 'bumping' && s.bumpOrigin) ? s.bumpOrigin : render;
    startBump(s, at, dirVec);
};

/**
 * A move failed. If a wall-bump is playing/pending it's an EXPECTED failure (we knew the
 * wall and never moved) — the bump is the visual, don't also bounce. Otherwise an
 * optimistic glide entered a room the server rejected: spring back to the last confirmed.
 */
export const failMove = (s: MoveAnimState) => {
    if (s.phase === 'bumping' || s.pendingBump) return;
    if (s.inFlight <= 0 || !s.lastConfirmed) return;
    s.queue = [];
    s.inFlight = 0;
    s.waitFrom = null;
    s.phase = 'bouncing';
    s.vx = 0;
    s.vy = 0;
};

/** Force the marker to a position immediately (first fix). */
export const snapTo = (s: MoveAnimState, pos: Vec3, render: Vec3) => {
    render.x = pos.x; render.y = pos.y; render.z = pos.z;
    s.phase = 'idle';
    s.queue = [];
    s.inFlight = 0;
    s.waitFrom = null;
    s.pendingBump = null;
    s.lastConfirmed = { ...pos };
    s.vx = 0;
    s.vy = 0;
};

/**
 * Advance one frame, mutating `render`. Glides are timed by wall clock (latency-
 * accurate regardless of fps); the bounce uses `frameScale` (normalized to 60fps).
 * Returns true while more frames are needed.
 */
export const advanceMoveAnim = (
    s: MoveAnimState,
    render: Vec3,
    frameScale: number
): boolean => {
    if (s.phase === 'gliding') {
        const seg = s.queue[0];
        if (!seg) { s.phase = 'idle'; return false; }
        const t = clamp((Date.now() - s.glideStart) / s.glideDur, 0, 1);
        const e = ease(t);
        render.x = seg.from.x + (seg.to.x - seg.from.x) * e;
        render.y = seg.from.y + (seg.to.y - seg.from.y) * e;
        render.z = seg.from.z + (seg.to.z - seg.from.z) * e;
        if (t >= 1) return advanceQueue(s, render, seg.from);
        return true;
    }

    if (s.phase === 'waiting') {
        // Parked one room ahead of confirmed truth, holding for the confirm (resumed in
        // settle). Safety: if it never comes, reconcile onto truth and stop.
        if (Date.now() - s.glideStart > MOVE_ANIM.WAIT_TIMEOUT_MS) {
            if (s.lastConfirmed) { render.x = s.lastConfirmed.x; render.y = s.lastConfirmed.y; render.z = s.lastConfirmed.z; }
            s.queue = [];
            s.waitFrom = null;
            s.phase = 'idle';
        }
        return false;
    }

    if (s.phase === 'bumping') {
        if (!s.bumpOrigin || !s.bumpVec) { s.phase = 'idle'; return false; }
        const t = clamp((Date.now() - s.glideStart) / s.glideDur, 0, 1);
        // Lean out toward the blocker and back: sin gives 0 → peak (mid) → 0.
        const k = Math.sin(Math.PI * t) * MOVE_ANIM.BUMP_DIST;
        render.x = s.bumpOrigin.x + s.bumpVec.x * k;
        render.y = s.bumpOrigin.y + s.bumpVec.y * k;
        if (t >= 1) {
            // In-place bump done — settle back at the room and stop.
            render.x = s.bumpOrigin.x; render.y = s.bumpOrigin.y; render.z = s.bumpOrigin.z;
            s.phase = 'idle';
            return false;
        }
        return true;
    }

    if (s.phase === 'bouncing') {
        const anchor = s.lastConfirmed;
        if (!anchor) { s.phase = 'idle'; return false; }
        const ax = (anchor.x - render.x) * MOVE_ANIM.BOUNCE_K;
        const ay = (anchor.y - render.y) * MOVE_ANIM.BOUNCE_K;
        const damp = Math.pow(MOVE_ANIM.BOUNCE_DAMP, frameScale);
        s.vx = (s.vx + ax * frameScale) * damp;
        s.vy = (s.vy + ay * frameScale) * damp;
        render.x += s.vx * frameScale;
        render.y += s.vy * frameScale;
        render.z += (anchor.z - render.z) * (1 - Math.pow(MOVE_ANIM.Z_BASE, frameScale));
        if (dist2d(render, anchor) < MOVE_ANIM.REST_EPS && Math.hypot(s.vx, s.vy) < MOVE_ANIM.REST_EPS) {
            render.x = anchor.x; render.y = anchor.y; render.z = anchor.z;
            s.phase = 'idle';
            s.vx = 0;
            s.vy = 0;
            return false;
        }
        return true;
    }

    return false;
};
