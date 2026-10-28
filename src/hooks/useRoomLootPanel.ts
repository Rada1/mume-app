/** @file useRoomLootPanel.ts — Selection and command-ready contents for the simple room loot list. */
import { useEffect, useMemo, useState } from 'react';
import type { DrawerLine } from '../types';
import { getDrawerObjectKeyword } from '../objects/objectTargetModel';

export type RoomLootSource = { id: string; label: string; commandTarget: string; containerId: string; queuedCorpseId?: string };

// --- Corpse navigation and item selectors ---
export const useRoomLootPanel = (corpses: RoomLootSource[], contents: Record<string, DrawerLine[]>, examine: (corpse: RoomLootSource) => void) => {
 const [corpseId, setCorpseId] = useState<string | null>(null);
 const corpse = corpses.find(item => item.id === corpseId);
 useEffect(() => { if (corpseId && !corpse) setCorpseId(null); }, [corpseId, corpse]);
 const lines = corpse ? contents[corpse.containerId] : undefined;
 const items = useMemo(() => {
  const candidates = (lines || []).filter(line => line.isItem && !line.isHeader)
   .map((line, index) => ({line, index, keyword:getDrawerObjectKeyword(line)})).filter(item => item.keyword);
  const totals = new Map<string, number>();
  candidates.forEach(({keyword}) => totals.set(keyword, (totals.get(keyword) || 0) + 1));
  const seen = new Map<string, number>();
  return candidates.map(({line, index, keyword}) => {
   const ordinal = (seen.get(keyword) || 0) + 1;
   seen.set(keyword, ordinal);
   return {id:line.stableId || line.entityId || line.id || String(index),
    label:line.text.replace(/\x1b\[[0-9;]*m/g, '').replace(/<[^>]*>/g, '').trim(),
    target:(totals.get(keyword) || 0) > 1 ? `${ordinal}.${keyword}` : keyword};
  });
 }, [lines]);
 const open = (selected: RoomLootSource) => { setCorpseId(selected.id); examine(selected); };
 return {corpse, items, loading:!!corpse && lines === undefined, open, back:() => setCorpseId(null)};
};
