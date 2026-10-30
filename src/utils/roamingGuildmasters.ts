/** @file roamingGuildmasters.ts — Identify guildmasters without fixed map flags. */
import type { GmcpOccupant } from '../types';

// --- Logic Section ---
const NAMES = new Set(['gaunt man', 'grey-cloaked man', 'cowled sorcerer', 'dark-robed man']);

export const hasRoamingGuildmaster = (npcs: GmcpOccupant[], subrace: string | undefined): boolean =>
    (subrace || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[_-]+/g, ' ').trim() === 'black numenorean' && npcs.some(npc =>
    [npc.name, npc.short, npc.shortdesc, npc._visibleRoomLabel].some(value =>
        NAMES.has((value || '').trim().toLowerCase().replace(/^(?:a|an|the)\s+/, '')))
);
