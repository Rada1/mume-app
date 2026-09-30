# Mapper (`src/components/Mapper/`)

The map renderer and room locator are separate concerns. All modes use the
worker-owned WebGL2 renderer for map drawing, with the existing Canvas2D renderer
available as a fallback. Immersion and Performance Modes send raw MUME
`Event.Moved` and `Room.Info` events to the map worker. The worker
applies WebCockpit's server-ID, learned-ID, movement-direction, and
name/description location order before updating the shared `MapperContext`
position. It seeds from the current room once per map load; per-packet app
guesses do not reset its tracking history.

## Renderers

- **All modes:** `performance/FastMapCanvas.tsx` transfers a fresh canvas
  to a module worker. The worker converts no React state and owns the reduced
  WebGL2 renderer. `performance/mapAdapter.ts` converts the bundled MUME tuple
  map once; worker frames carry only camera/player state and a small live-room
  overlay. `performance/vendor/rooms.ts` builds static terrain, exit, MOB/LOAD
  flag, and no-ride meshes once per map load. `performance/FastMapOverlays.ts`
  batches named doors, MMapper text marks, user/region labels, and line/arrow
  connection marks separately from the terrain meshes. It also draws a
  deduplicated connector beneath room art when a same-floor exit links rooms
  that are not grid neighbors. Doorways use the regular mapper's open/closed
  visuals and shared tap-to-open/close handler, including UP/DOWN doors; state
  changes update only those door vertices. Label-only changes do not resend the
  map or rebuild room meshes.

The fast renderer shows terrain, rooms, exits, player position, floors, pan,
and zoom. While movement commands are pending, it also draws the MMapper-style
solid gold prespammed route and endpoint. The worker follows known exits and
stops when a later branch is ambiguous. GMCP group members with known map IDs
appear as hollow, member-colored room squares with outlined name labels above them,
matching the player square at every zoom level. Only the small
group-location list is sent when it changes. The fast renderer omits region art,
non-group entity art, and exploration overlays.
Immersion keeps its DOM-based atmospheric scene and surrounding UI while all
modes share the worker-owned WebGL2 map renderer. If worker-owned WebGL2 cannot
initialize or later fails, the canvas is remounted through the existing Canvas2D
renderer.

Startup loads `public/nazgum-latest.mm2` by default with WebCockpit's
version-aware reader (schemas 17–42, except 37). The old
`public/mume_map_data.json` remains a compatibility fallback. User-imported
`.mm2` files use the same reader. The canonical model is retained alongside
compatibility tuples. All modes pass canonical `.mm2` typed arrays to the worker;
the JSON compatibility fallback uses the tuple adapter. Its CSR exit graph keeps
multiple destinations on one direction, and the worker builds its room locator
index once per map load. XML imports use the tuple adapter. Hit-testing still
uses the shared tuple-based handler. Performance Mode's
click-to-walk planner searches the canonical MM2 graph directly, retaining all
destinations in multi-target exits, the `out` direction, and live closed exits. It falls
back to tuple-based pathfinding for rooms outside the imported MM2 graph.

When a player manually runs `where`, the nearby-player table produces a brief
map radar pulse for other non-group players whose room name maps unambiguously
within the current zone's 10-by-10 neighborhood. The player and groupmates are
excluded; silent roster refreshes do not trigger pulses. The temporary overlay
is shared by regular, immersion, and Performance Mode maps and does not alter
group tracking or save the scan results.

See [performance-map.md](../../../docs/performance-map.md) for tests, HUD
measurements, repeatable performance checks, licensing, and release source
instructions. See the repository-root `THIRD_PARTY_NOTICES.md` for upstream
attributions.
