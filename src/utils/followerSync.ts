/**
 * Bridges text-only arrival/departure lines into the roomChars pipeline for
 * cases where MUME's GMCP doesn't emit Room.Chars.Add/Remove (notably mounts
 * and followers walking in alongside the player).
 *
 * Flow per event:
 *   text line  ──noteArrivalText──▶  pending timer (200ms)
 *   real GMCP  ──cancelArrival────▶  drop the pending timer (GMCP wins)
 *   timer ends without cancel  ───▶  synthesize occupant via injected callback
 *
 * Module-level state is intentional: this is a per-app singleton wired in
 * once from useGmcpOccupants.
 */

type SynthAddFn = (name: string, dir: string | null) => void;
type SynthRemoveFn = (name: string) => void;

const SYNTH_DELAY_MS = 200;

let addCallback: SynthAddFn | null = null;
let removeCallback: SynthRemoveFn | null = null;
const pendingAdds = new Map<string, ReturnType<typeof setTimeout>>();
const pendingRemoves = new Map<string, ReturnType<typeof setTimeout>>();

const keyFor = (name: string) => name.trim().toLowerCase();

export const initFollowerSync = (add: SynthAddFn, remove: SynthRemoveFn) => {
    addCallback = add;
    removeCallback = remove;
};

export const noteArrivalText = (name: string, dir: string | null) => {
    if (!name) return;
    const key = keyFor(name);
    const existing = pendingAdds.get(key);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
        pendingAdds.delete(key);
        addCallback?.(name, dir);
    }, SYNTH_DELAY_MS);
    pendingAdds.set(key, timer);
};

export const noteDepartureText = (name: string) => {
    if (!name) return;
    const key = keyFor(name);
    const existing = pendingRemoves.get(key);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
        pendingRemoves.delete(key);
        removeCallback?.(name);
    }, SYNTH_DELAY_MS);
    pendingRemoves.set(key, timer);
};

export const cancelArrival = (name: string) => {
    if (!name) return;
    const key = keyFor(name);
    const t = pendingAdds.get(key);
    if (t) {
        clearTimeout(t);
        pendingAdds.delete(key);
    }
};

export const cancelDeparture = (name: string) => {
    if (!name) return;
    const key = keyFor(name);
    const t = pendingRemoves.get(key);
    if (t) {
        clearTimeout(t);
        pendingRemoves.delete(key);
    }
};

// Direction word → single-letter code matching the rest of the codebase.
export const normalizeArrivalDir = (raw: string | null | undefined): string | null => {
    if (!raw) return null;
    const w = raw.trim().toLowerCase().replace(/^the\s+/, '');
    if (w.startsWith('n')) return w.startsWith('ne') ? 'ne' : w.startsWith('nw') ? 'nw' : 'n';
    if (w.startsWith('s')) return w.startsWith('se') ? 'se' : w.startsWith('sw') ? 'sw' : 's';
    if (w.startsWith('e')) return 'e';
    if (w.startsWith('w')) return 'w';
    if (w.startsWith('u')) return 'u';
    if (w.startsWith('d')) return 'd';
    return null;
};
