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
    // Text-decorator markers win over MUME's `type` field. MUME tags neutral PCs as
    // type='ally' but wraps their desc with dashes (-name-), and asterisks (*name*)
    // mark enemies — the visible decorator is what the user expects to drive the
    // category in the UI.
    const desc = typeof r.desc === 'string' ? r.desc.trim() : '';
    const name = typeof r.name === 'string' ? r.name.trim() : '';
    if (/^\*.+\*$/.test(desc) || /^\*.+\*$/.test(name)) return 'enemy';
    if (/^-.+-$/.test(desc) || /^-.+-$/.test(name)) return 'neutral';

    // Explicit type next.
    if (typeof r.type === 'string' && r.type.length > 0) {
        return r.type;
    }

    // Check labels array for MUME's player/enemy classification.
    if (Array.isArray(r.labels)) {
        const labels = (r.labels as unknown[]).map(l => String(l).toLowerCase());
        if (labels.some(l => l === 'enemy' || l === 'outlaw' || l === 'rogue' || l === 'hostile' || l === 'aggro')) return 'enemy';
        if (labels.some(l => l === 'ally' || l === 'friend' || l === 'grouped')) return 'ally';
        if (labels.some(l => l === 'neutral')) return 'neutral';
        if (labels.some(l => l === 'npc' || l === 'mob' || l === 'mobile')) return 'npc';
    }

    // Check flags array as secondary signal.
    if (Array.isArray(r.flags)) {
        const flags = (r.flags as unknown[]).map(f => String(f).toLowerCase());
        if (flags.some(f => f === 'enemy' || f === 'hostile' || f === 'outlaw')) return 'enemy';
        if (flags.some(f => f === 'ally' || f === 'friend')) return 'ally';
    }

    // Fall back to MUME's `pc` flag (boolean or 0/1).
    if (r.pc === true || r.pc === 1) return 'ally';
    if (r.pc === false || r.pc === 0) return 'npc';

    return undefined;
}
