/** @file useHostileCommandTarget.ts — Identifies enemies and engaged combatants for command filtering. */
import type { PopoverState } from '../types';
import { useGame, useVitals } from '../context/GameContext';
import { useCombatStore } from '../stores/useCombatStore';
import { getInlineCategoryAxes } from '../utils/inlineCategoryAxes';
import { normalizeCombatantName } from '../utils/combatUtils';
import { stripAnsiCodes } from '../utils/ansi';

// --- Combat Target Matching ---
const normalizeName = (value?: string | null): string => normalizeCombatantName(stripAnsiCodes(value || ''))
    .replace(/^[*-]+|[*-]+$/g, '').replace(/^\d+\./, '')
    .replace(/^(?:a|an|the)\s+/i, '').trim().toLowerCase();

export const useHostileCommandTarget = (selection: PopoverState): boolean => {
    const game = useGame();
    const vitals = useVitals();
    const engaged = useCombatStore(state => state.engagedOpponents);
    const axes = getInlineCategoryAxes(selection.category || selection.setId);
    if (selection.entityId === 'command-panel-self') return false;
    if (axes.categoryId === 'cat-enemy') return true;
    if (!game.inCombat || !axes.isCharacter || axes.location !== 'room') return false;

    const selectedId = selection.entityId?.match(/^roomchars:([^#]+)/)?.[1];
    const names = [selection.context, selection.displayName, selection.keyword].map(normalizeName).filter(Boolean);
    const opponents = [...engaged, { id: vitals.opponentId, name: vitals.opponentName }];
    return opponents.some(opponent => {
        if (selectedId && opponent.id != null) return selectedId === String(opponent.id);
        const opponentName = normalizeName(opponent.name);
        if (opponentName && names.includes(opponentName)) return true;
        const occupant = [...(game.roomPlayers || []), ...(game.roomNpcs || [])]
            .find(character => typeof character !== 'string' && opponent.id != null && String(character.id) === String(opponent.id));
        return typeof occupant === 'object' && [occupant.name, occupant.keyword].some(name => {
            const normalized = normalizeName(name);
            return normalized && names.includes(normalized);
        });
    });
};
