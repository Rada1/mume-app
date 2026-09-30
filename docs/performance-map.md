# Performance Mode map

## Renderer and scope

Performance Mode uses a dedicated module worker and WebGL2 on an
`OffscreenCanvas`. The fast renderer adapts WebCockpit's worker/client and
instanced room-rendering approach. It converts bundled MUME tuples to compact
transferable arrays and builds GPU room meshes once per map load. Binary
`.mm2` imports retain WebCockpit's canonical MMapper model in `MapperContext`;
Performance Mode converts its typed arrays directly to fresh worker buffers,
including the full CSR exit graph with multiple targets per direction. Camera
and player updates are coalesced before they cross the worker boundary.
Current-room terrain and exits are sent as a small overlay, so live GMCP
changes do not resend the full map or rebuild static meshes.

The fast profile keeps darkened terrain tiles, rooms, all MMapper MOB/LOAD
flags, MMapper's no-ride symbol, wall/up/down exits, named doors, text
infomarks, line/arrow connection marks, connectors for non-adjacent same-floor
and cross-floor room exits, user markers, region labels, the current-room marker, floor
selection, pan, zoom, and the existing main-thread
hit testing and click-to-walk actions. It also shows group members resolved from
GMCP map IDs: hollow, member-colored room squares with outlined name labels above them,
matching the player square at every zoom level. Group positions
travel as a small worker update; they never resend the map. Room exploration
shows visited rooms normally, previews directly connected rooms in grayscale,
and hides all other room tiles and room details. It reveals immediately without
a reveal animation. A room's flags briefly return to their original brightness
for one second when the room is first discovered, then return to their normal
tint. Region artwork and other entity art remain omitted.
The framebuffer is kept at one device pixel per CSS pixel in Performance
Mode. Immersion Mode uses the same WebGL2 map renderer with a transparent
canvas, preserving its DOM-based atmospheric scene and surrounding UI beneath
the map. Regular mode still uses the existing Canvas renderer.
Queued, unconfirmed movement commands draw the same solid gold prespammed-path
line and endpoint used by the regular renderer. The worker resolves the route
against the canonical exit graph, selects a known first destination when
available, and stops at later ambiguous exits instead of drawing a guessed
branch. Geometry is rebuilt only when the queued route changes.
The map canvas uses the current opaque log backdrop color, and automatic
player centering targets the middle cell of the map swipe wheel.

Room flags, static MMapper annotations, and door labels are converted and
batched in the worker when the map loads. Flags use MMapper's original
full-room transparent overlay textures, which define each icon's size and
placement. Exit connectors use MMapper's direction-specific endpoint geometry,
with a segmented middle span and filled direction triangles at 50% opacity.
One-way links show an arrow at the destination; two-way links show arrows at
both ends. Cross-floor links appear from either connected floor at the same
opacity.
The live current-room overlay keeps bundled exits that are absent from
partial GMCP updates, and an exit remains visually open even if its destination
is not in the loaded map. User and region label changes use a
small labels-only worker message, so they do not rebuild or resend terrain
meshes. Exit connectors follow MMapper's connection line builder rather than
connecting room centers. Doorways use the regular mapper's interactive door
art in Performance Mode: closed/open state is shown with the app's post and
door marks, including UP/DOWN door markers, and tapping continues through the
shared `open exit` / `close exit` handler. MMapper's UP/DOWN exit markers draw
over closed door icons and disappear while the door is open. State changes
update only the affected door and exit-marker geometry in the worker. MMapper
door textures are not used.
The no-ride overlay loads MMapper's original `no-ride.png` pixmap.

MMapper `.mm2` imports use WebCockpit's native versioned reader and normalize
supported files (schemas 17–42, except 37) into its canonical map model. The
import boundary also creates compatibility tuples. Regular mode uses those
tuples; immersion and Performance Modes adapt the retained canonical arrays directly,
without reducing multi-target exits through tuples. XML imports and bundled
MUME maps continue through the tuple adapter. The worker also owns room tracking: it consumes MUME
`Event.Moved` and `Room.Info`, tries server IDs and learned IDs first, then
movement direction and exact normalized name/description, and learns IDs for
future packets. Directional matching can disambiguate multiple mapped
destinations by room text, and will not blind-step an ambiguous exit. Only
events for the currently selected self/target view update the shared player
room. Hit-testing still uses the shared tuple-based handler. Performance Mode's
click-to-walk planner now searches the canonical MM2 graph directly, including
all destinations in multi-target exits, MMapper's `out` direction, and live
closed exits. The
existing tuple planner remains the fallback for rooms outside the imported
MM2 graph.

Manual `where` output can also show a brief radar pulse for nearby players not
in the group. The client resolves exact room names within the current zone and
a 10-by-10 map neighborhood, using the reported direction to choose between
duplicate names; ambiguous matches are omitted. This overlay is temporary and
shared across all three mapper modes, separate from persistent group positions.

When workers, transferable canvases, or WebGL2 are missing, or worker setup,
asset loading, shader compilation, or rendering fails, the component replaces
the transferred canvas and falls back to the existing Canvas renderer. The
worker is terminated when Immersion or Performance Mode ends or the renderer
unmounts.

## Telemetry

Open the existing performance HUD with **Ctrl+Shift+P**. While visible, it
collects regular main-thread metrics and asks the map worker for one-second
samples. Fast-map rows report worker render FPS, p95/max render intervals,
worker draw p95/max, static mesh build time and load count, update/coalescing
counts, and room count. The HUD also reports main-thread long tasks over the
last ten seconds when the browser supports the Long Tasks API. Telemetry is
disabled when the HUD is hidden.

## Repeatable verification

1. Run `npm run typecheck`, `npm run test:unit`, and `npm run build`.
2. Run the opt-in Chromium comparison on the same machine before and after
   renderer changes:

   ```powershell
   $env:RUN_MAP_BENCHMARK = '1'
   npm run test -- tests/performance-map.spec.ts -g "records a 30-second Canvas2D and worker map comparison" --workers=1
   ```

   It samples each renderer for 30 seconds under continuous zoom input and
   emits a `MAP_BENCHMARK` JSON line with browser, viewport, frame FPS and
   p95/max interval, plus HUD worker render p95/max, map build time/count,
   update/coalescing counts, main-thread draw p95, and long-task count/max.
   For device-level results, repeat on the target desktop and mobile devices
   with the same browser, viewport, bundled map, and MUME simulator state.
3. Run the native `.mm2` import browser check against `data/arda.mm2`:

   ```powershell
   npm run test -- tests/mm2-performance-import.spec.ts --workers=1
   ```

   It imports the real MMapper map through Settings and verifies the canonical
   room graph reaches the Performance Mode worker renderer.
4. Repeat movement, floor changes, and click-to-walk while logging in through
   the simulator. Confirm one static mesh build per map load, no full-map messages during
   movement or pan/zoom, and no worker activity after leaving Performance Mode.
   Confirm unsupported-WebGL2 and worker-error fallback, then verify regular
   mode map controls and immersion's WebGL map over its atmospheric scene.

### Local comparison

The opt-in Playwright benchmark was run in Chromium 145.0.7632.6 on Windows,
with a 1280×720 viewport and the bundled 29,967-room map. Each renderer ran for
30 seconds with continuous zoom input. This is a synthetic local browser result,
not a target-device or release-build benchmark.

| Metric | Regular Canvas2D | Performance worker/WebGL2 |
| --- | ---: | ---: |
| Page animation frame rate | 60 FPS | 60 FPS |
| Page animation frame p95 / max | 16.7 / 33.4 ms | 16.7 / 33.3 ms |
| Map renderer FPS (HUD) | 17 FPS | 59 FPS |
| Canvas draw p95 / peak | 1.4 / 14.9 ms | — |
| Worker render interval p95 / max | — | 28.5 / 29.5 ms |
| Worker draw p95 / max | — | 0.2 / 0.2 ms |
| Static mesh build | — | 13.5 ms, one load |
| Full map size | Canvas path | 29,967 rooms, loaded once |
| Main-thread long tasks in sample | 0 | 0 |

The worker path processed 1,867 zoom events and built its static meshes once.
The page animation loop remained at 60 FPS in both runs; the HUD's map renderer
rate was 17 FPS for Canvas2D and 59 FPS for the worker. This synthetic local
measurement is not a target-device or release-build benchmark. Repeat it on
target desktop and mobile devices before making device-specific performance
claims. The intended targets remain 60 FPS desktop and 30 FPS mobile where the
device supports them.

## Licensing and source distribution

The application is licensed under `GPL-3.0-or-later` because the Performance
Mode port adapts WebCockpit mapper code. The complete license and third-party
attributions ship in `LICENSE`, `THIRD_PARTY_NOTICES.md`, `/LICENSE.txt`, and
`/THIRD_PARTY_NOTICES.md`. MMapper pixmaps retain their separate GPL-2.0
notice in `public/assets/mmapper/COPYING.txt`.

For every release that distributes a build, publish the exact corresponding
source tree and build scripts at the same version tag and include a direct
source archive link with the distributed build. Update
`public/SOURCE_CODE.txt` to point to that release tag or commit before building
the release. The source repository is
https://github.com/Rada1/MUME-App. Do not publish an installable release while
the source pointer still contains the release-process reminder.
