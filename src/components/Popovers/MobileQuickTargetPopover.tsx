/** @file MobileQuickTargetPopover.tsx — Direct actions and inspection for a tapped mobile log target. */
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CommandActionTargetEntry } from '../../objects/commandActionTargetModel';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import { executeCommandPanelInput } from '../../hooks/executeCommandPanelInput';
import { useCorpseContentsStore } from '../../stores/useCorpseContentsStore';
import { useUIStore } from '../../stores/useUIStore';
import { getMobileQuickTarget } from '../../utils/mobileQuickTargetActions';
import { isLikelyCargoLine } from '../../utils/mountCargoUtils';
import { stripAnsiCodes } from '../../utils/ansi';
import { resolveActionIcon } from '../../utils/actionIcons';
import { Eye } from 'lucide-react';

// --- Inspection and actions ---
export const MobileQuickTargetPopover = ({ entry, controller, close }: {
 entry: CommandActionTargetEntry; controller: ReturnType<typeof useCommandTreeController>; close: () => void;
}) => {
 const { game, vitals } = controller;
 const model = useMemo(() => getMobileQuickTarget(entry, game.inlineCategories || [], vitals.characterInfo),
  [entry, game.inlineCategories, vitals.characterInfo]);
 const containerId = `quick-target:${game.roomNum}:${entry.id}:${model.target}`;
 const lines = useCorpseContentsStore(state => state.contents[containerId]);
 const [inspectionTarget, setInspectionTarget] = useState('');
 const [considerTarget, setConsiderTarget] = useState('');
 const popoverState = useUIStore(state => state.popoverState);
 const considering = considerTarget === containerId;
 const inspecting = inspectionTarget === containerId;
 const actionsRef = useRef<HTMLDivElement>(null);
 const actionTopRef = useRef<number | null>(null);
 // Keep the action row in place as the inspection area grows above it.
 useLayoutEffect(() => {
  const actions = actionsRef.current;
  const panel = actions?.closest<HTMLElement>('.is-inline-target-popover');
  if ((!inspecting && !considering) || !actions || !panel || actionTopRef.current === null) return;
  const top = parseFloat(panel.style.getPropertyValue('--target-popover-top'));
  if (!Number.isFinite(top)) return;
  const delta = actionTopRef.current - actions.getBoundingClientRect().top;
  panel.style.setProperty('--target-popover-top', `${Math.max(8, Math.min(top + delta, window.innerHeight - panel.offsetHeight - 8))}px`);
 }, [inspecting, lines, considering, popoverState?.capturedConsiderLines]);
 const examine = () => {
  if (!model.target || game.isSpectateMode) return;
  actionTopRef.current = actionsRef.current?.getBoundingClientRect().top ?? null;
  setInspectionTarget(containerId);
  const command = `examine ${model.target}`;
  useCorpseContentsStore.getState().requestContents(containerId, model.target);
  game.parser.setPendingFlags(true, true, command);
  game.executeCommand(command, true, true, false, true, {shouldFocus:false, fromUi:true});
 };
 const consider = () => {
  const current = useUIStore.getState().popoverState;
  if (!model.target || !current || game.isSpectateMode) return;
  actionTopRef.current = actionsRef.current?.getBoundingClientRect().top ?? null;
  setConsiderTarget(containerId);
  useUIStore.getState().setPopoverState({...current, isCapturingConsider:true, capturedConsiderLines:undefined});
  const command = `consider ${model.target}`;
  game.parser.setPendingFlags(true, true, command);
  game.executeCommand(command, true, true, false, true, {shouldFocus:false, fromUi:true});
 };
 let equipment = false;
 const inspection = (lines || []).filter(line => !line.isHeader && (model.kind !== 'corpse' || isLikelyCargoLine(line)))
  .map(line => {
   const text = stripAnsiCodes(line.text).replace(/<[^>]*>/g, '').trim();
   const heading = model.kind !== 'corpse' && /\bis using:\s*$/i.test(text);
   if (heading) equipment = true;
   const slot = equipment && !heading ? (line.prefix || stripAnsiCodes(line.text).match(/^\s*(<[^>]+>)/)?.[1] || '').replace(/[<>]/g, '').trim() : '';
   return { text, heading, item: equipment && !heading, slot };
  }).filter(line => line.text);
 return <div className="mobile-quick-target">
  {considering && <div className="mobile-quick-target-details">{popoverState?.isCapturingConsider ? 'Considering…' :
   (popoverState?.capturedConsiderLines || []).map((line, index) => <div key={`${index}:${line}`}>{stripAnsiCodes(line).replace(/<[^>]*>/g, '').trim()}</div>)}</div>}
  {inspecting && lines === undefined && <div className="mobile-quick-target-details">Examining…</div>}
  {model.kind === 'corpse' && inspecting && lines !== undefined && <div className="mobile-quick-target-details">
   <span className="mobile-quick-target-caption">Contents</span>
   {inspection.length ? inspection.map((line, index) => <div key={`${index}:${line.text}`}>{line.text}</div>) : <div>Nothing inside.</div>}
  </div>}
  {model.kind !== 'corpse' && inspecting && lines !== undefined && <div className="mobile-quick-target-details">{inspection.length ? inspection.map((line, index) => <div key={`${index}:${line.text}`} className={line.heading ? 'mobile-quick-target-equipment-heading' : line.item ? 'mobile-quick-target-equipment-item' : undefined}>{line.slot && <span className="mobile-quick-target-equipment-slot">{line.slot}</span>}{line.item ? <span className="mobile-quick-target-equipment-name" title={line.text}>{line.text}</span> : line.text}</div>) : 'No description available.'}</div>}
  <div ref={actionsRef} className="mobile-quick-target-actions">
   {model.target && !game.isSpectateMode && <button type="button" data-action="examine" onClick={examine}><Eye size={15} aria-hidden="true" />Examine</button>}
   {model.actions.map(action => <button type="button" key={action.label} data-action={action.label.toLowerCase().replace(/\s+/g, '-')} onClick={() => {
    if (action.label === 'Consider') { consider(); return; }
    executeCommandPanelInput(game, action.command, false, false, false, false, {shouldFocus:false, fromUi:true});
    close();
   }}><span aria-hidden="true">{React.createElement(resolveActionIcon(action.command, action.label), { size:15 })}</span>{action.label}</button>)}
   {!model.actions.length && (!model.target || game.isSpectateMode) && <span className="mobile-quick-target-empty">No quick actions available.</span>}
  </div>
 </div>;
};
