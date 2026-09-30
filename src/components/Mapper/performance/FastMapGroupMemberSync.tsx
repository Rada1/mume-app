/**
 * @file Sends resolved group locations to the map worker when GMCP/map state changes.
 */
// --- Logic Section ---

import { useEffect, useMemo } from 'react';
import type { MapCanvasProps } from '../MapCanvas';
import type { FastMapWorkerClient } from './client';
import { resolveFastMapGroupMembers } from './groupLocations';

interface FastMapGroupMemberSyncProps {
  mapProps: MapCanvasProps;
  clientRef: React.MutableRefObject<FastMapWorkerClient | null>;
  workerReady: boolean;
}

export function FastMapGroupMemberSync({ mapProps, clientRef, workerReady }: FastMapGroupMemberSyncProps) {
  const members = mapProps.groupMembers ?? [];
  const resolved = useMemo(() => resolveFastMapGroupMembers(
    members,
    mapProps.preloadedCoordsRef.current,
    mapProps.rooms,
    mapProps.serverIdIndexRef?.current ?? {},
    mapProps.performanceMapRef?.current ?? null,
  ), [members, mapProps.rooms, mapProps.renderVersion, mapProps.performanceMapRef, mapProps.performanceMapRevision, mapProps.serverIdIndexRef, mapProps.preloadedCoordsRef]);

  useEffect(() => {
    if (workerReady) clientRef.current?.setGroupMembers(resolved);
  }, [clientRef, resolved, workerReady]);

  return null;
}
