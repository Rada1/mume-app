<!-- @file mapper-movement-correlation.md — Arrival correlation compared with reference clients. -->
# Mapper arrival correlation

The predicted path represents commands awaiting responses; it is not proof that
the marker has followed the player. Location processing must retain the server's
movement evidence independently of that command queue.

## Reference behavior

- [MMapper's GMCP parser](https://github.com/MUME/MMapper/blob/master/src/parser/mumexmlparser-gmcp.cpp)
  stores `Event.Moved.dir` for the following room observation. A second movement
  flushes an observation already waiting to be processed. Room IDs below 1 are
  invalid. Prompt lighting and room identity are independent inputs.
- [WebCockpit's tracker](https://github.com/Khazdul/webcockpit/blob/a863b1829b892379306c9862ef4a587bc22e15dd/src/map/tracking.ts)
  pairs movement and room events, treats subsequent room observations without a
  movement as looks, and follows a unique exit when a room packet is missing.
  Its [locator](https://github.com/Khazdul/webcockpit/blob/a863b1829b892379306c9862ef4a587bc22e15dd/src/map/locate.ts)
  uses positive server IDs, direction, names, descriptions, and exits. Darkness is
  not a reason to ignore a visible room.

## Client correction

Previously `MapperContext` received `Event.Moved` only to clear scouting state.
The actual matcher guessed movement from room ID changes and the locally queued
command. With no usable ID and no local command (following, for example), an
arrival could leave the marker in the previous room. Conversely, an unidentified
look while commands were queued could consume a step that had not arrived.
Negative IDs were incorrectly treated as authoritative IDs.

`useMapperMovementEvents.ts` now retains the server direction until the next
player GMCP room packet. The room handler uses that direction for correlation;
after this event stream is observed, a packet without a movement does not dequeue
another command unless a changed positive room ID independently confirms arrival.
Servers without movement events retain the existing fallback.
Scout/spectate observations and text echoes do not consume the pending direction.
Session reset and disconnect discard pending server movement state.

Arrival matching lives in `resolveMovingRoom.ts`; applying room metadata and
exits lives in `applyRoomInfoObservation.ts`. `useRoomInfoHandler.ts` coordinates
these stages and publishes the location. Each module stays below 300 lines.

Exact server-ID matching always checks the bundled map, independently of whether
the packet represents a move or a look. Previously this lookup was inside the
movement-only branch. With discovery mode's sparse live-room cache, a packet
without a retained movement event could therefore leave the marker stationary,
even though the bundled map knew the destination. A Group.mapid or restored
position selecting a room before its first Room.Info could also prevent that
room from being materialized and explored. `useMapDiscoveryTracking.test.tsx`
reproduces both failures with an initially empty live-room cache.

A second movement event flushes a missing room response through a known unique
exit, consuming its queued command once. An unknown or ambiguous exit consumes
the response without inventing a location. XML arrivals already confirmed before
the first GMCP packet are not consumed twice.

Regression coverage lives in `useMapGmcphandlers.test.tsx`, alongside existing
mixed-protocol ownership tests. The reported screenshot has no packet capture,
so these reproduce confirmed code defects rather than establish which packet
sequence occurred in that specific session.
