# Third-party notices

## WebCockpit mapper code

The Performance Mode mapper adapts WebCockpit's worker-owned map architecture,
room mesh batching, texture catalogue, projection shaders, and MMapper draw
rules. Upstream: [Khazdul/webcockpit](https://github.com/Khazdul/webcockpit),
commit `3ea720f8778a93c6ff943968cd2d6e4079771186`. WebCockpit is licensed
under GNU GPL version 3 or (at your option) any later version. The relevant
upstream files are `src/map/client.ts`, `src/map/worker/core.ts`,
`src/map/render/webgl.ts`, `src/map/render/rooms.ts`,
`src/map/render/textures.ts`, `src/map/render/shaders.ts`,
`src/map/render/palette.ts`, `src/map/model.ts`, `src/map/mm2.ts`,
`src/map/locate.ts`, and `src/map/tracking.ts`.

Adapted code in this application is in
`src/components/Mapper/performance/` (including `vendor/` and `webcockpit/`). The complete
GPL-3.0-or-later text is in `LICENSE` and is also shipped in web builds as
`/LICENSE.txt`.

## MMapper room-rendering rules and tiles

The reduced room mesh rules in `src/components/Mapper/performance/vendor/rooms.ts`
are adapted from WebCockpit's MMapper-derived room builder, which identifies
MMapper 26.06.0's `display/MapCanvasRoomDrawer.cpp` as its source. The room
tile textures and room-flag overlays used by the fast renderer are MMapper
pixmaps in `public/assets/mmapper/pixmaps/`, including the upstream
`no-ride.png` overlay. That directory retains its upstream license
text in `COPYING.txt` and source note in `README.md`; the MMapper repository is
licensed under GPL-2.0. The MMapper material remains under its own license.

Exit connector geometry in `src/components/Mapper/performance/exitConnectionGeometry.ts`
is adapted from MMapper's `src/display/ConnectionLineBuilder.cpp` and
`src/display/Connections.cpp`, including its filled direction triangles.
MMapper is licensed under GPL-2.0-or-later; see
[`MUME/MMapper`](https://github.com/MUME/MMapper).

## Corresponding source for releases

The application is licensed `GPL-3.0-or-later`. For every release that
distributes an installable or bundled build, publish the exact matching source
tree (including local modifications and build scripts) under the same release
tag, and include the source archive or a direct link to it with the build.
Hosted builds should expose `/SOURCE_CODE.txt`, updated to name the matching
release tag or commit. The public source repository is
[Rada1/MUME-App](https://github.com/Rada1/MUME-App). Release instructions and
the map's license scope are in `docs/performance-map.md`.
