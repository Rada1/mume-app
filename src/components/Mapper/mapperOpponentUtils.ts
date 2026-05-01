/**
 * @file mapperOpponentUtils.ts
 * @description Opponent matching helpers for mapper occupant rendering.
 */

type OpponentCandidate = {
    id?: string | number;
    name: string;
};

// --- Logic Section ---

const normalizeCombatName = (name: string) => (
    name
        .trim()
        .replace(/^[*-]+|[*-]+$/g, '')
        .replace(/^(a|an|the)\s+/i, '')
        .toLowerCase()
);

export const isOpponentOccupant = (
    occupant: OpponentCandidate,
    occupants: OpponentCandidate[],
    opponentId?: string | number | null,
    opponentName?: string | null
) => {
    if (opponentId != null && occupant.id != null) {
        return String(opponentId) === String(occupant.id);
    }

    if (!opponentName) return false;

    const opponent = normalizeCombatName(opponentName);
    const matches = occupants.filter(candidate => {
        const name = normalizeCombatName(candidate.name);
        return opponent === name || opponent.includes(name) || name.includes(opponent);
    });

    return matches.length === 1 && matches[0] === occupant;
};
