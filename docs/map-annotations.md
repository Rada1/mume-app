# Editing map markers and room icons

## Custom markers and imported text markers

Click or tap a marker to open its editor directly. Edit its label, coordinates, floor, and text size; the regular canvas renderer also supports editing dot size. There is no separate marker list or map button.

Click or tap a marker to open its editor directly. Choose **Save** to commit edits or **Delete marker** to remove the selection. **Undo** restores the most recently deleted marker. Room-square context menus contain room actions; marker management is not a room action. Markers can still be dragged in map edit mode.

Adding a marker in map edit mode opens this editor immediately. Cancelling a newly added marker removes its placeholder.

Deleted marker IDs are stored separately from the marker collection so bundled text markers do not reappear when the base map loads. Canonical MMapper lines and arrows retain their existing rendering; this editor manages text markers.

## Room flags and resource/service icons

Open **Room Info** and click the pencil beside the listed attributes. The compact editor opens directly underneath. Use **Room flags → Add flag** to choose distinctions (alignment, lighting, portability, riding) or service/resource flags such as Shop, Guild, Water, and Herb. Selected flags appear as removable chips. Choose a direction under **Exit flags** to add or remove exit and door flags. The editor is collapsed initially in both play and edit modes.

Room Info also exposes alignment, lighting (including Dark), portability, and riding attributes in play mode. `mapAttributesEdited` tracks explicit edits per attribute so incoming room updates preserve them. All room attribute and flag editing stays in Room Info.

Changes save locally with the map and take precedence over imported flags when revisiting the room. Both normal and Performance Mode maps honor an explicitly empty flag selection. These controls edit map annotations, not the server's room properties.

## Implementation

- `useMapMarkerEditor.ts` owns marker drafts, validation, selection, deletion, undo, and creation.
- `MapMarkerManager.tsx` renders the selected marker editor.
- `deletedMapMarkers.ts` persists deletion tombstones; marker loading and bundled-map merging honor them.
- `useRoomInfoCard.ts` owns room icon edits; `RoomMapFlagsEditor.tsx` renders the choices.
- `MapperRoom.mapFlagsEdited` distinguishes an explicit local flag selection (including empty arrays) from imported defaults.
- `performance/localMapEdits.ts` applies overrides to worker buffers. Static room meshes rebuild only when the edited flag signature changes, rather than on ordinary room updates.
- Performance Mode uses the editable marker collection for text labels; canonical line and arrow infomarks remain separate.

Marker hit testing in `mapMarkerHit.ts` uses the worker renderer's exact label anchor, rotation, pixel font size, and room-coordinate offset, with a separate legacy-canvas path.
