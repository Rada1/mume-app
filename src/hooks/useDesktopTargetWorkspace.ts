/** @file useDesktopTargetWorkspace.ts — Tab navigation and remembered desktop target selection. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PopoverState } from '../types';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import type { useCommandTreeController } from './useCommandTreeController';
import { getDesktopWorkspaceKind, getDesktopWorkspaceTarget } from '../utils/desktopTargetWorkspaceTargets';

// --- Location and Selection ---
export const useDesktopTargetWorkspace = (controller: ReturnType<typeof useCommandTreeController>, request: PopoverState, close: () => void) => {
 const requestedKind = getDesktopWorkspaceKind(request);
 const [kind, setKind] = useState<'Room'|'Inventory'|'Equipment'>(requestedKind);
 const [selections, setSelections] = useState<Partial<Record<'Room'|'Inventory'|'Equipment', CommandActionTargetEntry>>>({});
 const requestedTarget = useMemo(() => getDesktopWorkspaceTarget(request, controller.entries), [request, controller.entries]);
 const previousRequest = useRef<{request: PopoverState; target: CommandActionTargetEntry}|null>(null);
 useEffect(() => {
  const previous = previousRequest.current;
  const newRequest = previous?.request !== request;
  if (newRequest) setKind(requestedKind);
  setSelections(selections => {
   const selected = selections[requestedKind];
   if (!newRequest && selected && selected.id !== previous?.target.id) return selections;
   return selected === requestedTarget ? selections : {...selections, [requestedKind]: requestedTarget};
  });
  previousRequest.current = {request, target: requestedTarget};
 }, [request, requestedTarget, requestedKind]);
 useEffect(() => {
  const onKey = (event: KeyboardEvent) => {
   if (event.key !== 'Escape') return;
   event.preventDefault();
   close();
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
 }, [close]);
 const select = useCallback((entry: CommandActionTargetEntry) => {
  setSelections(previous => previous[kind]?.id === entry.id ? previous : {...previous, [kind]: entry});
 }, [kind]);
 const initialTarget = selections[kind] || (kind === requestedKind ? requestedTarget : undefined);
 return {kind, setKind, initialTarget, select};
};
