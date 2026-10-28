/** @file roomOccupantTransition.ts — Keeps confirmed travelling occupants through room changes. */
import type { GmcpOccupant } from '../types';

// --- Room transition identity ---
export const occupantsTaggedForRoom = (chars:Record<number,GmcpOccupant>,room:string | number):Record<number,GmcpOccupant> =>
 Object.fromEntries(Object.entries(chars).filter(([,occupant]) => occupant._roomNum != null
  && String(occupant._roomNum) === String(room)));

/** A ridden mount travels with the player even when MUME sends no fresh Add. */
export const tagRiddenMountForRoom = (chars:Record<number,GmcpOccupant>,room:string | number):Record<number,GmcpOccupant> => {
 let changed=false;
 const next={...chars};
 for (const [key,occupant] of Object.entries(chars)) {
  const description=[occupant.desc,occupant.short,occupant.shortdesc,occupant.name].filter(Boolean).join(' ');
  if (!/\bridden by you\b/i.test(description)) continue;
  const {_visibleRoomOrder,_visibleRoomLabel,...identity}=occupant;
  next[Number(key)]={...identity,_roomNum:room};changed=true;
 }
 return changed ? next : chars;
};
