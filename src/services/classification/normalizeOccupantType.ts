/**
 * Maps MUME's various occupant tagging conventions to the canonical `type`
 * field used by classifyOccupant. MUME's GMCP help documents `type` (ally /
 * enemy / neutral / npc / you), but the wire data sometimes uses `pc: 0|1`
 * (or boolean) as the primary distinction. Normalize here so the classifier
 * stays strict and downstream consumers see a single canonical field.
 *
 * Returns the canonical type string, or undefined if no signal is present —
 * undefined means "no inline button" (the strict default).
 */
export function normalizeOccupantType(raw: unknown): string | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const r = raw as Record<string, unknown>;

    // Explicit type wins.
    if (typeof r.type === 'string' && r.type.length > 0) {
        return r.type;
    }

    // Fall back to MUME's `pc` flag (boolean or 0/1).
    if (r.pc === true || r.pc === 1) return 'ally';
    if (r.pc === false || r.pc === 0) return 'npc';

    return undefined;
}
