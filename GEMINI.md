# GEMINI MUD Client: Architectural Overview

This document provides a high-level overview of the MUME application's architecture to aid AI-driven development and refactoring.

## 📜 Self-Updating Mandate
**CRITICAL:** Any major structural changes (new hooks, new context providers, new UI layers, or API changes to core services) **MUST** be reflected in this document immediately by the developer (AI or human).

## Core Principles
- **Modularity**: Business logic is strictly separated into custom React hooks (`src/hooks/`).
- **Layered UI**: The main entry point (`src/index.tsx`) is a thin orchestrator that delegates to semantic layers in `src/components/Layout/`.
- **Type Safety**: A "Zero-Any" policy is enforced across the codebase.
- **Consolidated UI State**: All shared game and UI states are centralized in `GameContext.tsx`.
- **Immersion Mode**: A master toggle (disabled by default) that synchronizes weather, lighting, and smooth animations. Managed via `isImmersionMode` in `GameContext.tsx`.

## 🎯 Feature Mapping (Where to look first)

To minimize token usage and skip "whole codebase" searches, use this map:

### 🎮 Game State & UI Context
- **Incoming transport performance:** `src/hooks/useTelnet.ts` routes each binary GMCP packet once through `src/utils/telnet/GmcpDecoder.ts`; scalar vitals live in `gmcpVitals.ts`. Text framing and ordered tokenization are in `src/hooks/useTelnetText.ts` and `useTelnetTextQueue.ts`. Run `src/hooks/useTelnet.gmcp.test.tsx` for duplicate-dispatch and stream-order regressions.
- **Central State (HP, Mana, Target, Inventory):** `src/context/GameContext.tsx`
- **Map & Exploration State:** `src/context/MapperContext.tsx`
- **User Input & Command History:** `src/context/InputContext.tsx`
- **Spectate & Snoop Queue:** `src/context/GameContext/state.ts` (spectateQueue, lastSnoopStartTime)
- **Entity Registry (NPCs, Players, Items):** `src/hooks/useEntityRegistry.ts` (Source of Truth)
- **User Settings & Persistence:** `src/hooks/useSettings.ts`, `src/context/GameContext/useSettingsState.ts`
- **Global Types & Interfaces:** `src/types/index.ts`
- **Inline Category -> Trait -> Button Model:** `src/utils/inlineActionModel.ts`, `src/utils/actionUtils.ts`, `src/components/Popovers/StandardMenuPopover.tsx`
- **Reverse Command Target Lookup:** `src/hooks/useCommandActionSuggestions.ts`, `src/utils/reverseCommandTargets.ts`, `src/objects/commandActionTargetModel.ts`, `src/objects/doorActionTargets.ts` (shared room, gear, and named door candidates; specialized/staged inputs still use `commandTargetSuggestionResolver.ts`).
- **Legacy Categorization / Compatibility:** `src/utils/categorizationUtils.ts`, `src/components/Settings/TraitSettings.tsx`

### 🏗️ UI & Layout
- **Main App Shell:** `src/index.tsx`
- **Core Layout Layers:** `src/components/Layout/` (Atmospheric, HUDClusters, MainContent, Modals)
- **HUD Components:** `src/components/HUD/ThisIsYouConsole.tsx` (Unified 'This is You' Console with slide-down minimize via `src/stores/useCharacterPanelStore.ts`, `ThisIsYouVitalsTier.tsx`), `src/components/HUD/MapRoomInfoHeader.tsx` (Unified spacious map telemetry header), `src/components/HUD/LogDockedInput.tsx` (Unified docked command bar), `src/components/Layout/HUD/` (MapperCluster, StatsCluster, LineCluster, GroupDrawer, Interactive Header with manual target input)
- **Side Drawers (Inventory, Equipment, Stats):** `src/components/Drawers/`
- **Inline Button Popovers & Command Panel:** `src/components/Popovers/StandardMenuPopover.tsx`, `src/components/HUD/UnifiedCommandPanel.tsx`, `src/components/Popovers/StandardMenu/CommandActionTargetPicker.tsx`, `src/components/Popovers/StandardMenu/CommandMountTarget.tsx`, `src/components/HUD/CommandHelpBanner.tsx`, `src/hooks/useCommandHelpMode.ts`, `src/utils/commandHelpUtils.ts`, `src/utils/logHelpUtils.ts` (horizontal category bar prevents vertical layout shifting; hovering previews categories and mousing away collapses them; clicking pins a category open; mount cargo renders as an elevated floating popover; help mode enables command inspection).
- **Mapper Component:** `src/components/Mapper/` (and `src/mapper/renderer.ts`)
- **Map annotation editing:** `docs/map-annotations.md`, `src/hooks/useMapMarkerEditor.ts`, `src/components/Mapper/MapMarkerManager.tsx`, `src/components/Mapper/RoomMapFlagsEditor.tsx`, `src/utils/deletedMapMarkers.ts`, and `src/components/Mapper/performance/localMapEdits.ts`.
- **Docked Sliding Panels (Chat, Players, Help, Editor, Archive):** `src/utils/dockedPanelUtils.ts`, `src/components/Help/HelpPanel.tsx`, `src/components/Messages/ChatWindow.tsx`, `src/components/Players/PlayersPanel.tsx`, `src/components/Utility/MumeEditor.tsx`, `src/components/Utility/MumeArchive.tsx`
- **Privileged Shaper Workspace:** `src/shaper/` and `docs/shaper.md` for concept-zone builder UI, validation, future collaboration, and deploy planning. Entry is hidden behind `canAccessShaper()`.

### 🧠 Logic & Networking
- **Low-level Telnet/GMCP:** `src/hooks/useTelnet.ts`
- **GMCP Data Handlers:** `src/hooks/useGmcpHandlers/` (Vitals, Room, Group, Occupants)
- **Game Output Parsing (Text):** `src/hooks/GameParser/useGameParser.ts` (Orchestrator)
- **Parser Sub-Hooks:** `src/hooks/GameParser/` (Combat, Comm, Room, Stat, Atmosphere, Prompt, Account, Time, etc.)
- **Panel Pagination:** `src/hooks/GameParser/useGameplayPager.ts` handles viewer prompts before capture boundaries; `src/utils/pagerPrompt.ts` shares detection with the telnet buffer. Keep manual paging interactive and preserve the server pager preference.
- **Action Filtering:** `src/utils/actionUtils.ts` (Capability -> Button Map)
- **Command Parsing (User Input):** `src/services/parser/services/mudParser.ts`
- **Message Log & Combat:** `src/hooks/useMessageLog.ts`
- **Command Control (Sending to Game):** `src/hooks/useCommandController.ts`
- **Specialized Handlers:** `usePracticeHandler.ts`, `useShopHandler.ts`, `useQuestsHandler.ts`
- **Buttons & UI Interactions:** `useButtons.ts`, `useSpatButtons.ts`, `src/hooks/interactions/` (Pointer, Gestures, Taps), `useViewport.ts`
- **Spectate Automation (Rotation/Tells):** `useSpectateAutomator.ts`
- **Session Control:** `useSessionManager.ts`, `useSessionRecorder.ts`, `useSessionReplayer.ts`
- **Advanced Processing:** `useTriggerProcessor.ts`, `useKeywordOverrides.ts`, `useMessageHighlighter.ts`
- **Tokenization & Highlighting:** `src/services/parser/Tokenizer.ts` (Keyword-focused entity extraction)
- **Audio & Atmosphere:** `useAtmosphereAudio.ts`, `useSoundSystem.ts`, `useZoneMusic.ts`, `useWeatherSounds.ts`, `useTerrainSounds.ts`
- **Sound editors:** `SoundSettings.tsx` contains Zone Music / Sound Effects / UI Sounds tabs, using `useSoundSettingsSections.ts`, `useZoneMusicSettings.ts`, and `useSoundEffectEditor.ts`.
- **Client macros:** `docs/custom-keybindings.md`, `useClientMacroStore.ts`, `useClientMacroCommands.ts`, `useClientMacroHotkeys.ts`, and `ClientMacroSettings.tsx` (Settings → Actions/Macros).

## 🛠️ Common Tasks Cheat Sheet

| Task Type | Files to Open |
| :--- | :--- |
| **Add a New Command** | `useCommandController.ts`, `GameContext.tsx` |
| **Fix a Layout Issue** | `src/components/Layout/`, `src/styles/layout.css` |
| **Handle a New GMCP Packet** | `useGmcpHandlers.ts`, `GameContext.tsx`, `types/index.ts` |
| **Change Message Styling** | `useMessageLog.ts`, `useMessageHighlighter.ts`, `MessageLog.css` |
| **Fix Inline Button Menus** | `inlineActionModel.ts`, `actionUtils.ts`, `StandardMenuPopover.tsx` |
| **Update Parser Logic** | `src/hooks/GameParser/`, `useGameParser.ts` |
| **Add a New Modal/Setting** | `ModalsLayer.tsx`, `useSettings.ts`, `SettingsModal.tsx` |
| **Update Button Logic** | `useButtons.ts`, `useButtonLogic.ts`, `ButtonUtils.ts` |
| **Adjust Audio/Atmosphere** | `useAtmosphereAudio.ts`, `useSoundSystem.ts`, `useZoneMusic.ts` |
| **Corner Sky Fades & Cloud Entry** | `src/hooks/useEnvironmentSceneTransition.ts`, `src/hooks/useEnvironmentTransitions.ts`, `src/components/Atmosphere/EnvironmentWeatherLayers.tsx`, `EnvironmentVignetteLayers.tsx`; shared one-second opacity/entry progress, retained scene-local lighting/weather styles, and independent slow cloud drift. `node scripts/verify_vignette_transition.mjs` checks actual browser compositing. |
| **Complete Dawn/Dusk Sky Blend** | Pass calibrated `gameTime` into `useEnvironmentTransitions`; `src/utils/twilightSceneLayers.ts` blends the real sunlight/night profiles and stars across the one-minute solar window. `src/utils/solarTiming.ts` puts the visual horizon crossing one game hour after the listed phase time. `src/hooks/useEnvironmentSolarTransitions.test.ts`, `src/utils/solarTiming.test.ts`, and `scripts/verify_solar_sky.mjs` cover timing and continuity. |
| **Modify Drawers/UI Tabs** | `src/components/Drawers/`, `DrawerManager.tsx` |
| **Fix Broad Highlighting** | `Tokenizer.ts`, `useEntityRegistry.ts` |
| **Replay a Session** | `useSessionReplayer.ts`, `useSessionManager.ts` |
| **Manage Custom Traits** | `inlineActionModel.ts`, `TraitSettings.tsx`, `useSettingsStore.ts` |
| **Zone Colors & Highlights** | `src/utils/zoneColors.ts`, `src/styles/zoneFrame.css` (client rim and edge glow), `src/styles/immersionDamagePulse.css`, `src/hooks/useZoneThemeSync.ts`, `MessageLog.tsx`, `MessageLog.css` |
| **Map Telemetry & Overlays** | `MapRoomInfoHeader.tsx`, `MapRoomInfoHeader.css`, `MapSettings.tsx` |
| **Map Find & Filter Controls** | `MapFilterBar.tsx`, `MapFilterCategories.ts`, `MapFilterBar.css` |
| **Tactical Mobile Targeting** | `TacticalTargetBar.tsx`, `useTacticalTargeting.ts`, `commandTargetUtils.ts` |
| **Plan or Build Shaper Mode** | `docs/shaper.md`, `src/shaper/`, `src/shaper/access/shaperAccess.ts` |

## 🚫 Avoid Scanning (Use .geminiignore)
- **Data/Logs:** Do NOT open `.txt`, `.xml`, `.mm2`, or large `.json` files in the root.
- **Scripts:** Ignore `.py` scripts unless specifically asked to refactor the build process.
- **Assets:** Never scan `public/assets/`.

## Command Flow
1. **User Interaction**: Triggered via `InputArea`, `CustomButton`, or `SwipeGesture`.
2. **Controller Logic**: `useCommandController` determines the command type and applies target substitution.
3. **Network Layer**: `useTelnet` sends the final string to the server.
4. **Response Handling**: Server sends GMCP/Text; `useTelnet` notifies listeners; UI updates via `GameContext`.

## Development Guidelines
- **Mandatory Reading**: Refer to `ARCHITECTURE.md` for strict coding standards (300-line limit, etc.).
- **GMCP First**: Prefer GMCP data over text parsing for all game state updates.
- **Thin Components**: Logic belongs in hooks; components should only handle rendering.



## Command Panel V2

Desktop inline entity menus now render `DesktopTargetWorkspace.tsx`, reusing `CommandTreeGearQuickMenu` for Room / Inventory / Equipped tabs with commands left and targets right. `useDesktopTargetWorkspace.ts` remembers tab selections; `useDesktopTargetWorkspaceStore.ts` keeps the panel open through outside clicks and inspection captures until Close or Escape. The Actions stack slot follows this store. The workspace controller retains previews and skips command-panel shop/practice open requests.

Give/Put open a third destination column through `useCommandGearTransfer.ts` and the shared transfer hook's fixed-source option. Workspace backgrounds follow Details, selected targets follow log highlight colors, and log selections resolve against live target identities. Redundant location headings and selected-name labels are omitted beneath the location tabs.

Containers/corpses use a separate chevron to expand `CommandTreeGearContents.tsx` directly below their selectable row. Contents show keywords and All; ordinary targets have no chevrons, and corpse G/All is omitted from actions. Parent nouns remain attached when choosing contained objects.

Command-panel and popover subcategories share `src/utils/commandTreeSections.ts`; `CommandTreeGearActions.tsx` shows class/task sections with wrapping command rows in the workspace, without the overarching category headings.

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
