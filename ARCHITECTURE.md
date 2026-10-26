# MUME Client: AI-Native Architecture Standards

This document defines the strict coding standards required to keep this codebase "Agent-Friendly" and maintainable for both humans and AI.

## 1. The 300-Line Mandate
- **Limit:** No source file (`.ts`, `.tsx`, `.css`) should exceed **300 lines of code**.
- **Enforcement:** If a file grows beyond 300 lines, it is a signal that the component or hook is doing too much.
- **Action:** Decompose logic into sub-hooks (`src/hooks/`) or sub-components (`src/components/`).

## 2. Organized Folder Structure (Feature-Based)
To prevent "File Sprawl" caused by the 300-line rule, files must be organized into semantic folders.
- **Rule:** If a feature (like the Mapper or Settings) requires multiple files, they should be grouped into a dedicated folder (e.g., `src/components/Mapper/` or `src/hooks/Settings/`).
- **Hierarchy:** Prefer deep, organized folders over a flat, cluttered directory. Each major folder should ideally contain its own `README.md` explaining the files within.

## 3. Extreme Code Clarity
Every file and block of code must be "Self-Explaining" to ensure both AI and human developers can navigate it instantly.

### File Headers
Every file must start with a concise header:
```typescript
/**
 * @file [FileName]
 * @description [1-2 sentences explaining the Single Responsibility of this file.]
 */
```

### Logic Chunking
Use clear, visual separators for logical blocks within a file. This helps AI agents use the `replace` tool accurately:
```typescript
// --- GMCP Vitals Parsing ---
// Logic for handling HP/Mana updates...

// --- Movement Failure Logic ---
// Logic for handling "Alas, you cannot go that way"...
```

## 4. The "Self-Updating" Rule
- **Mandate:** AI Agents (and humans) MUST update `GEMINI.md` and `ARCHITECTURE.md` whenever a major structural change occurs.
- **Structural Changes include:** Adding a new Context Provider, a new UI Layer, or refactoring a core Hook's API.

## 5. State & Logic Separation
- **Telnet ingestion:** `useTelnet.ts` owns the connection and routes binary GMCP exactly once through `GmcpDecoder.ts`. `gmcpVitals.ts` applies scalar fields without redispatching package callbacks. `useTelnetText.ts` owns text/prompt/snoop framing; `useTelnetTextQueue.ts` serializes tokenization. Preserve metadata-before-text ordering and per-packet identity, including identical repeated packets. Callback/configuration contracts are exported from `src/types/telnet.ts` through `src/types/index.ts`.
- **Panel pagination:** Preserve the player's server pager preference. Intercept viewer prompts before game-prompt boundary handling; active panel snapshots and silent captures advance via raw Return without restarting command middleware. Manual and snooped viewers must not auto-advance.
- **Context (`src/context/`):** Shared game and UI state (HP, target, drawer status).
- **Hooks (`src/hooks/`):** Headless business logic (Networking, Parsing, Command Controller).
- **Corner sky transitions:** `useEnvironmentSceneTransition.ts` owns one one-second frame clock for weather and lighting snapshots. Interrupted updates retain the visible weighted scenes rather than promoting a partially visible target to full opacity. Each new destination gets a fresh second from that mix; cancelled callbacks must remain inert even when their destination repeats. `useEnvironmentTransitions.ts` projects those weights into the vignette and weather layer inputs; each retained scene owns its lighting/weather classes. Avoid global `:has()` weather rules that restyle an outgoing scene before incoming clouds are visible. Cloud entry translation uses the same progress, with slow background drift continuing on the retained cloud element.
- **Solar sky blending:** `useEnvironmentTransitions` accepts calibrated `gameTime`; `twilightSceneLayers.ts` projects outdoor natural-light contributions into the real day/night profiles over the full 60-second dawn/dusk window. Stars derive their opacity from those same visible night contributions. The clock blend preserves both endpoint appearances and absorbs cutoff source packets without a second visual fade. Indoor/artificial lighting retains the room transition clock; full-screen lighting overlays remain independent.
- **Visual solar schedule:** `solarTiming.ts` uses the listed `SOLAR_HOURS` dawn/dusk values as the visual sunrise/sunset. Both `sunPosition.ts` and `twilightAppearance.ts` use this shared schedule: the sun appears at dawn and disappears at dusk; the 60-real-second day/night transition starts 30 seconds before and ends 30 seconds after each crossing.
- **Components (`src/components/`):** Pure "Presentational" layers. They should be "thin" and only handle rendering.
- **Shaper (`src/shaper/`):** Privileged builder workspace. Domain model, validation, and future collaboration/deploy logic stay headless under `model/`, `hooks/`, `collaboration/`, or `deployment/`; components only render the builder UI.

## 6. Type Safety (Zero-Any)
- **Rule:** The use of `any` is strictly prohibited.
- **Process:** If a complex object (like a GMCP packet) arrives, define its interface in `src/types/index.ts` first.

## 7. Capability-Based Entity System
To ensure reliable inline button menus and consistent visuals, the application uses a centralized **Entity Registry**.
- **The Registry (`src/hooks/useEntityRegistry.ts`):** The Single Source of Truth. It scans entities (NPCs, Items, Players) once and assigns them **Capabilities** (e.g., `isVendor`, `isWeapon`, `isWearable`).
- **Data-Driven Actions (`src/utils/actionUtils.ts`):** Decisions on which buttons to show are made by mapping Capabilities to Button Sets.

## 8. Inline Action Model
Inline log actions must resolve through this invariant:
```text
inline entity -> category -> traits -> buttons
```

Command input can query this same model in reverse: command template → eligible buttons → entity traits → current targets. `src/utils/reverseCommandTargets.ts` uses the shared trait resolver and action eligibility filter, with candidates from `commandActionTargetModel.ts`. `doorActionTargets.ts` projects named GMCP doors into both the target panel and suggestions. Learned Bash belongs to both offense and door actions. Multi-argument commands and special catalog inputs retain their staged resolvers.
- **Categories:** Classify the entity (`cat-enemy`, `cat-npc`, `cat-inventory-object`) and own default trait IDs.
- **Traits:** Reusable action bundles (`trait-combat`, `trait-examine`, `trait-container`) and own button IDs.
- **Buttons:** Concrete commands (`btn-kill`, `btn-examine`).
- **Legacy Support:** `inline-*` IDs are compatibility aliases only. New inline action logic belongs in `src/utils/inlineActionModel.ts`.
- **Forbidden Shortcut:** Do not attach buttons or button sets directly to categories. Use category -> trait -> button resolution.
## 9. Interactive Highlighting Standards
To maintain UI precision and prevent "highlight sprawl," the text parsing pipeline follows strict rules for entity detection:
- **Keyword-First:** Entities (NPCs, Players) must only be highlighted based on their specific `keyword` or derived `noun`. Never highlight full descriptive strings (e.g., "A tall man...").
- **Word Boundaries:** All regex matches in the `Tokenizer` must use word boundaries (`\b`) to prevent partial word matches and overlapping interactive spans.
- **Null Safety:** Rendering logic in the Mapper and Interaction utilities must implement defensive null checks (e.g., `(color || '')`) to remain robust against incomplete GMCP packets during rapid room transitions.

## Map Annotation Overrides

Marker editing uses `useMapMarkerEditor.ts` with a thin `MapMarkerManager.tsx` view. Persist deletion tombstones separately so bundled text markers cannot resurrect after reload. Room flag edits use `MapperRoom.mapFlagsEdited` to make local selections, including empty arrays, authoritative over imported flags. Preserve this field during room updates, honor it in both renderers, and invalidate cached room icons when an explicit selection changes. See `docs/map-annotations.md`.

Room Info owns attribute editing in play mode; `mapAttributesEdited` records overrides per field. Marker clicks open the marker editor directly, while room context menus expose room actions.

The pencil beside attribute badges opens the compact room/exit editor underneath. Add flag menus share `useRoomFlagEditor.ts`; selected flags are removable chips. Exit `mapFlagsEdited` preserves local metadata while GMCP continues to update live closed/locked state. Worker marker hit bounds follow worker label anchoring, font size, rotation, and the room-coordinate offset.

## Client Macros

Client macro definitions and invocations are intercepted in `useCommandController.ts` before command splitting. Settings, `/alias`, `/unalias`, and hotkeys share `useClientMacroStore.ts`. Definition commands save without executing their bodies. Resolve nested macros before dispatch, rejecting recursive or oversized chains, and execute each step through the normal command controller. Register macro keyboard handling before default numpad/F-key handling. See `docs/custom-keybindings.md`.

## 10. Shaper Access Boundary
Shaper Mode is a privileged building surface, not a normal player feature.
- **Fail Closed:** Shaper must stay hidden unless `canAccessShaper()` returns true.
- **No Direct Deploy:** Draft editing, validation, command preview, and future MCP tools must not bypass human-approved deploy locks.
- **Concept First:** Shaper edits operate on concept drafts. Live map/game state is baseline/reference data unless deployment explicitly applies commands.


## Command Panel V2

Desktop entity popovers share the quick location menus through `DesktopTargetWorkspace.tsx`: Room / Inventory / Equipped tabs above commands on the left and targets on the right. `useDesktopTargetWorkspace.ts` owns navigation and per-tab selection; `useDesktopTargetWorkspaceStore.ts` preserves the panel independently of transient popover/capture state. Outside clicks and action execution do not dismiss it; Close and Escape do. `ClientPanelStack` uses the same lifetime for its Actions slot. Its shared controller retains target previews and does not consume command-panel shop/practice navigation requests.

Give and Put continue from the selected source through `useCommandGearTransfer.ts`, using `useCommandTreeTransfer` with a fixed source. Commands, source targets, and destination arguments occupy three columns in syntax order; the final argument click executes. Workspace surfaces inherit the Details panel opacity, and target rows share the inline log selection palette. Location tabs replace the redundant location heading, and the command column omits the selected target name.

Workspace container/corpse rows separate object selection from a dedicated chevron disclosure. `CommandTreeGearContents.tsx` renders selectable keyword contents directly below the row, retaining the parent noun for contained-item commands. Ordinary targets have no chevron. All remains in contents; the corpse G/All action is omitted.

`commandTreeSections.ts` shares subcategory and class assignment/order across the command catalog and workspace. `CommandTreeGearActions.tsx` renders class/task headings with wrapping commands and omits the overarching category headings in the workspace, allowing several buttons on one row without changing the target layout.

Desktop quick location controls are ordered Room / Equipped / Inventory. The Room menu includes local room entities and room objects in separate vertical sections; `useCommandTreeItems.ts` and `useCommandGearQuickMenu.ts` share the existing context-valid action cascade for both.

Direct command-panel execution uses `src/hooks/executeCommandPanelInput.ts` for the normal input sound while retaining UI-origin metadata. Calls through handleButtonClick already play that sound; silent background captures must continue using executeCommand directly.
The command workspace is command-first: desktop has five root groups (Abilities, Movement, Info, Objects, Social); mobile readability mode has four (Abilities, Info, Objects, Social), with movement controls inside Abilities. Info merges observation and information commands, preserving observation target behavior. On mobile, its horizontal section selector defaults to Observation and retains the Character, Game, Navigation, People and Weather sections when available. On mobile, Look, Examine and Consider targets use horizontal Room / Inventory / Equipment selectors, with Directions and Containers available where relevant. Info reports and observation target taps capture Details without opening an inline entity menu or replacing the active command menu. Executing Info commands preserves the current section, including outside readability mode. Mobile Info, Objects and Social use horizontal section selectors above the selected section commands, which scroll vertically. Desktop commands, ability classes, observation targets and Get/Put locations use vertically stacked section headers with their contents. Objects uses Move for item transfers including Fill/Empty, Modify for lighting/camp and container access, and Use for consumables and other item actions. Mobile Abilities shows combat commands directly in a horizontal row without a Combat header, then a separate class selector and its commands below. `CommandPanelV2.tsx` renders the tree; `useCommandTree.ts` owns navigation and trait-based target filtering; `useCommandTreeCatalog.ts` memoizes catalog normalization and section metadata; `useCommandTreeController.ts` reuses execution, captures, chat, shop and practice. Mobile Abilities, Info, Objects and Social share a direction pad and minimap on the right; holding a targetable command temporarily replaces them with targets. `CommandTreeHeldTargets.tsx` preserves specialized workflows, with Get contents and Put/Give destinations expanding the layout to three columns as needed; releasing the hold restores movement. Quick Stance, Mood, Cast Speed and Alertness controls remain visible in that order. State options open as compact single-column popovers below their button, retaining the command menu underneath; useQuickStateMenuPosition.ts anchors and bounds these dropdowns. Root category hovers switch immediately; nested hover previews wait 180 ms; clicks and keyboard focus open immediately. Tapping the active category keeps it open; category buttons switch menus rather than toggling them closed. `UnifiedCommandPanel.tsx` offers a persistent Legacy switch to `UnifiedCommandPanelLegacy.tsx`. Frozen V1 references and restoration notes are in `docs/archive/command-panel-v1/`.

Desktop command docking uses slots in MainContentLayer.tsx and LogDockedInput.tsx. CommandPanelV2.tsx portals the character summary and quick controls into the map region, keeps command input aligned with the log, and fills the remaining right region with category buttons. CommandDockStrip.css owns the full-width bottom grid; category menus anchor above their button and additional columns extend left.

Desktop chat and group are independent floating panels, rendered by ChatTranscriptWindow.tsx and GroupStatusWindow.tsx. useFloatingClientPanel.ts owns saved geometry, header dragging, corner resizing, keyboard movement/resizing, viewport bounds, and snapping to nearby panels/client edges through floatingPanelGeometry.ts. FloatingClientPanel.css owns their opaque surfaces. Desktop chat is excluded from the exclusive dock layout; mobile keeps its existing dock behavior.

CapturedDetailsSidePanel.tsx also uses the shared floating client panel on desktop: Details opens at the top-right with saved geometry, supports snapping with Chat/Group, and stays open when interacting elsewhere. Its report content scrolls within the resized window; ModalsLayer.tsx preserves floating reports during outside clicks.

ParleyChannelChip.tsx and useParleyChannelMenu.ts share the destination cascade between ChatCommunicationBar.tsx and LogDockedInput.tsx: hover the chip for channels, hover Tell/Whisper/Ask for recipients, then select a recipient to commit both. Tell uses online players; Whisper/Ask use shared room-character entries and exclude self. Non-directed channels commit on click. Menus open upward with recipient columns to the left, retain click/focus access, and never send messages during destination selection.

Nested command, inventory/equipment, and parley menus use menuVerticalPlacement.ts to choose upward or downward placement based on available viewport space. Nested columns stay aligned with their parent row; the chosen side also bounds their scroll height. useUpwardCommandBranches.ts retains its existing name but now supports both directions.

The header's former Group panel is now an Entities window. GroupStatusWindow.tsx renders Group Members and Room Entities sections; useRoomEntitiesPanel.ts projects shared room-character entries, keeps listed group members out of the other-entities section, and updates selected-target metadata plus the current target without executing game actions. GroupTableView.tsx supports an optional member-selection callback. Existing floating group geometry/preferences remain compatible.

Action target rows share currentCommandTarget.ts for NPC/enemy current-target matching, red highlighting, and crosshairs. CommandTreeCommandList.tsx uses commandDefaultTarget.ts to execute a clicked command against the current target only if targetsFor(button) includes it; otherwise it opens target selection. Hover/focus still previews alternatives. Observation defaults reuse executeCommandTreeObservation so Look/Examine/Consider retain Details capture, and Help/spectate restrictions remain enforced.

On mobile, an open V2 command guide portals into the command bar slots as an in-flow four-row console: command input, one six-button action row, one six-button state/equipment/inventory row, then character info. CommandDockStrip.css uses explicit six-column grids to prevent wrapping and keeps mobile menu widths inside the viewport. The separate desktop three-region strip and rotated-landscape layout retain their own geometry.

Mobile minimaps render their canvas directly at the preview frame size in KeyboardMapPreview.css, without scaling or cropping a larger map surface. The renderer observes these native bounds; the frame owns the edge fade. useMapperInteractions.ts pans the compact map with one finger instead of invoking movement gestures. The initial mobile camera zoom is DEFAULT_MOBILE_MAP_ZOOM (0.7) in mapperUtils.ts; desktop camera defaults are independent.

Command panel eligibility prepares `getEligibleActionButtonIds` from `src/utils/actionUtils.ts` once per target and passes the resulting set to `isButtonValidForEntity`. Keep these sets scoped to a single rebuild so trait edits, character restrictions, and room changes remain live. `useCommandTree.ts` memoizes catalog normalization separately from target eligibility. Regression coverage lives in `src/utils/actionUtils.performance.test.ts` and `src/hooks/useCommandTree.performance.test.tsx`.
