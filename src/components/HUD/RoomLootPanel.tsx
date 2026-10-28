/** @file RoomLootPanel.tsx — A direct Get list for room objects and corpse contents. */
import React from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { DrawerLine } from '../../types';
import type { GroundLootCandidate } from '../../hooks/useRoomLootCandidates';
import type { CommandTargetSuggestion } from '../../objects/targetSuggestionTypes';
import { useRoomLootPanel, type RoomLootSource } from '../../hooks/useRoomLootPanel';

// --- Render Section ---
export const RoomLootPanel: React.FC<{
 isMobile: boolean; roomCorpses: RoomLootSource[]; groundLootItems: GroundLootCandidate[];
 cargoBusy: boolean; corpseContents: Record<string, DrawerLine[]>;
 examineCorpse: (corpse: RoomLootSource) => void; lootCorpse: (corpse: RoomLootSource) => void;
 lootAllValuables: () => void;
 giveLootToMount: boolean; setGiveLootToMount: (enabled: boolean) => void;
 recipientTarget: string; setRecipientTarget: (target: string) => void; mounts: CommandTargetSuggestion[];
 transferLootToMount: (items: Array<{target: string; label: string}>, mount: string, corpse?: RoomLootSource) => void;
 executeCorpseCommand: (corpse: RoomLootSource, command: string) => void;
 executeCommand: (command: string) => void; onClose: () => void;
}> = ({isMobile, roomCorpses, groundLootItems, cargoBusy, corpseContents, examineCorpse, lootCorpse, lootAllValuables, executeCorpseCommand, executeCommand, onClose, giveLootToMount, setGiveLootToMount, recipientTarget, setRecipientTarget, mounts, transferLootToMount}) => {
 const menu = useRoomLootPanel(roomCorpses, corpseContents, examineCorpse);
 const wasBusy = React.useRef(cargoBusy);
 React.useEffect(() => {
  if (wasBusy.current && !cargoBusy && menu.corpse && !corpseContents[menu.corpse.containerId]) examineCorpse(menu.corpse);
  wasBusy.current = cargoBusy;
 }, [cargoBusy, corpseContents, examineCorpse, menu.corpse]);
 return <section className="room-loot-panel room-loot-simple" role="dialog" aria-modal={isMobile || undefined} aria-label="Get items">
  <header className="room-loot-panel-header">
   {menu.corpse ? <button className="room-loot-back" type="button" onClick={menu.back} aria-label="Back to ground items"><ChevronLeft size={16}/><span>{menu.corpse.label}</span></button>
    : <strong>Get</strong>}
   <button type="button" onClick={onClose} aria-label="Close loot list"><X size={17}/></button>
  </header>
  <div className="room-loot-transfer-mode">
   <button type="button" role="switch" aria-checked={giveLootToMount} className={`room-loot-mount-toggle${giveLootToMount ? ' is-enabled' : ''}`}
    disabled={cargoBusy} onClick={() => setGiveLootToMount(!giveLootToMount)}>
    <span className="room-loot-toggle-track" aria-hidden="true"><span /></span><span>Loot to mount</span>
   </button>
   {giveLootToMount && mounts.length > 0 && <select aria-label="Mount recipient" value={recipientTarget} disabled={cargoBusy} onChange={event => setRecipientTarget(event.target.value)}>
    <option value="mount">My mount</option>{mounts.map(mount => <option key={mount.key} value={mount.value}>{mount.label}</option>)}
   </select>}
  </div>
  <div className="room-loot-list">
   {menu.corpse ? <>
    <button className="room-loot-simple-row is-all" type="button" disabled={cargoBusy || (giveLootToMount && menu.loading)} onClick={() => {
     if (!menu.corpse) return;
     if (giveLootToMount) transferLootToMount(menu.items, recipientTarget, menu.corpse); else lootCorpse(menu.corpse);
    }}>All</button>
    {menu.loading ? <p className="room-loot-simple-empty">Examining…</p> : menu.items.length ? menu.items.map(item =>
     <button className="room-loot-simple-row" type="button" key={item.id} disabled={cargoBusy}
      onClick={() => { if (!menu.corpse) return; if (giveLootToMount) transferLootToMount([item], recipientTarget, menu.corpse);
       else executeCorpseCommand(menu.corpse, `get ${item.target} ${menu.corpse.commandTarget}`); }}>{item.label}</button>)
     : <p className="room-loot-simple-empty">Nothing inside.</p>}
   </> : <>
    <button className="room-loot-simple-row is-all" type="button" disabled={cargoBusy || (giveLootToMount && !groundLootItems.length)} onClick={() => {
     if (giveLootToMount) transferLootToMount(groundLootItems.map(item => ({target:item.commandTarget,label:item.label})), recipientTarget);
     else executeCommand('get all');
    }}>All</button>
    {roomCorpses.length > 0 && <button className="room-loot-simple-row" type="button" disabled={cargoBusy} onClick={lootAllValuables}>Valuables</button>}
    {roomCorpses.map(corpse => <button className="room-loot-simple-row" type="button" key={corpse.id} disabled={cargoBusy}
     onClick={() => menu.open(corpse)}><span>{corpse.label}</span><ChevronRight size={15} aria-hidden="true"/></button>)}
    {groundLootItems.map(item => <button className="room-loot-simple-row" type="button" key={item.id} disabled={cargoBusy}
     onClick={() => giveLootToMount ? transferLootToMount([{target:item.commandTarget,label:item.label}], recipientTarget) : executeCommand(`get ${item.commandTarget}`)}>{item.label}</button>)}
   </>}
  </div>
 </section>;
};
