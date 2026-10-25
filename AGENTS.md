# AGENTS.md: AI Orchestration & Developer Blueprint

Performance capture: `/perf` includes React Client/Log/Commands render boundaries and supported-browser slow-frame script/layout attribution. See `docs/client-performance-capture.md` and `src/utils/uiPerformance.ts`. React durations are inclusive and require a development/profiling build; worker map idle intervals are not stalls.

Command-tree eligibility is lazy per group and target snapshot. Root navigation must read group labels without materializing every `group.buttons` array; only viewed groups and explicitly requested command targets need checks. Keep catalog normalization/sorting independent of live target filtering.

Terminal sizing lives in `src/hooks/useTerminalLayout.ts`, called by `useViewport.ts`. Coalesce resize notifications per animation frame, cache font probes, and avoid unchanged CSS writes. Font loading must invalidate the cached probe; cleanup must cancel scheduled work.

Only GameProvider owns `useViewport()`. Replay/help consumers must read the shared viewport context to avoid duplicate layout/keyboard observers and competing terminal CSS writes. `/perf` isolated-command latency comes from `src/utils/commandLatency.ts`; send-to-text is browser-observed latency, and log commit is before paint. Do not attribute overlapping/spammed commands as isolated replies.

This document is the primary onboarding and operational guide for AI agents (Gemini CLI, Jules, etc.) and human developers. It defines the system's "Mental Model" to ensure high-speed, high-accuracy contributions.

## 🧠 System Mental Model
The MUME Client is an **AI-Native, Hook-Driven Mobile Client** for the MUME MUD.
- **State First:** `GameContext.tsx` is the single source of truth for HP, Mana, Target, and Inventory.
- **Headless Logic:** Business logic (parsing, telnet, commands) MUST live in custom hooks (`src/hooks/`).
- **Thin UI:** Components are for rendering only. If you see logic in a component, refactor it into a hook.

## 🛠️ Essential AI Constraints (From ARCHITECTURE.md)
1.  **300-Line Mandate:** No file exceeds 300 lines. If it does, decompose it.
2.  **Zero-Any Policy:** Use `src/types/index.ts` for all interface definitions. Never use `any`.
3.  **Self-Explaining Code:** Every file requires a `@file` header and clear `// --- Logic Section ---` separators.

## 🎯 Strategic File Map for Agents
| If you want to... | Look here first... |
| :--- | :--- |
| **Change Game Logic** | `src/hooks/useGmcpHandlers.ts`, `src/hooks/useGameParser.ts` |
| **Modify Button Behavior** | `src/hooks/useButtonLogic.ts`, `src/hooks/useInteractionHandlers.ts` |
| **Update Global State** | `src/context/GameContext.tsx`, `src/types/index.ts` |
| **Fix UI/Layout** | `src/components/Layout/`, `src/styles/layout.css` |
| **Edit Command Flow** | `src/hooks/useCommandController.ts`, `src/hooks/useCommandExecutor.ts` |
| **Adjust Mapper** | `src/components/Mapper/`, `src/mapper/renderer.ts` |
| **Map Navigation and Coordinate Alignment** | `src/hooks/useMapperRoomCoordinates.ts`, `src/components/Mapper/hooks/useSmartWalk.ts`, `src/components/Mapper/hooks/canonicalSmartWalk.ts`, `src/components/Mapper/mapNavigation.test.tsx` |
| **Performance Map Renderer** | `src/components/Mapper/performance/`, `docs/performance-map.md`, `src/components/Mapper/README.md` |
| **Plan or Build Shaper Mode** | `docs/shaper.md`, `src/shaper/`, `src/shaper/access/shaperAccess.ts` |
| **Generate Shaper Room Prose** | `src/shaper/model/shaperRoomProse.ts`, `scripts/print_shaper_prose_context.js`, `scripts/apply_shaper_room_prose.js` |
| **Research Mudlle/MUDLLE** | `docs/mudlle_intro.md`, `docs/mhelp_guide.md`, `src/shaper/components/ShaperHelpPanel.tsx` |
| **Fix Broad Highlighting** | `src/services/parser/Tokenizer.ts`, `src/hooks/useEntityRegistry.ts` |
| **Spectate Rotation** | `src/hooks/useSpectateAutomator.ts`, `src/hooks/GameParser/useGameParser.ts` |
| **Manage Entity Traits** | `src/utils/inlineActionModel.ts`, `src/utils/categorizationUtils.ts`, `src/components/Settings/TraitSettings.tsx` |
| **Track Object Identity and Target Menus** | `src/objects/objectTargetModel.ts`, `src/objects/roomTargetSuggestions.ts`, `src/objects/gearTargetSuggestions.ts`, `src/hooks/GameParser/useObjectActionTracker.ts`, `src/hooks/GameParser/useCaptureParser.ts` |
| **Command Panel Shop Workflow** | `src/hooks/useCommandShop.ts`, `src/hooks/useCommandShopCatalog.ts`, `src/hooks/GameParser/useShopListParser.ts` (silent panel stock/variant captures through the prompt), `src/stores/useCommandShopStore.ts`, `src/components/HUD/CommandShopStock.tsx`, `src/components/HUD/CommandShopActions.tsx`, `src/components/HUD/CommandShopOutputPanel.tsx` |
| **Command Panel Skills and Guild Training** | `src/hooks/useCommandPractice.ts`, `src/hooks/useGuildPracticeActions.ts`, `src/stores/useCommandPracticeStore.ts`, `src/components/HUD/CommandPracticeTargets.tsx`, `src/components/HUD/CommandPracticeActions.tsx`, `src/components/HUD/CommandPracticeOutputPanel.tsx` |
| **Command Panel Chat and Composer** | `src/components/HUD/CommandPanelViews.tsx`, `src/components/HUD/CommandCommunicationInlineComposer.tsx`, `src/hooks/useCommandPanelChat.ts`, `src/components/Messages/ChatTranscriptContent.tsx`, `src/hooks/useChatPanel.ts`, `src/hooks/useChatTranscript.ts`, `src/components/HUD/CommandChatHistoryPanel.tsx`, `src/hooks/useOnlineCommandTargets.ts` |
| **Command Bar Server Aliases** | `src/components/Controls/AliasSyncControl.tsx` (Appearance settings), `src/hooks/GameParser/useAliasParser.ts`, `src/stores/useCommandAliasStore.ts`, `src/utils/mumeCommandCatalog.ts`, `src/utils/commandAliasDisplay.ts`, `src/hooks/aliasSuggestionCommand.ts` (resolves expansions for target/spell suggestions). Explicit sync uses the panel snapshot queue; aliases override built-in abbreviations, stay scoped to the player session, and keep the original alias command on the wire. |
| **Client Macros & Keybindings** | `docs/custom-keybindings.md`, `src/stores/useClientMacroStore.ts`, `src/hooks/useClientMacroCommands.ts`, `src/hooks/useClientMacroHotkeys.ts`, `src/hooks/useClientMacroEditor.ts`, `src/components/Settings/ClientMacroSettings.tsx`. Actions/Macros holds client chains; intercept `/alias` before semicolon splitting, invoke with `/name`, and register macro hotkeys before default numpad/F-key handlers. |
| **Sound Settings Sections** | `src/components/Settings/SoundSettings.tsx`, `ZoneMusicSettings.tsx`, `SoundEffectOverrides.tsx`, `src/hooks/useSoundSettingsSections.ts`, `useZoneMusicSettings.ts`, `useSoundEffectEditor.ts`. Zone Music / Sound Effects / UI Sounds follow `AUDIO_MANIFEST.effects.channel`; custom text triggers belong to game sound effects. |
| **Command Panel Target and Action Columns** | `src/components/HUD/UnifiedCommandPanel.tsx`, `src/components/HUD/CommandHelpBanner.tsx`, `src/components/Popovers/StandardMenu/CommandActionTargetPicker.tsx`, `src/components/Popovers/StandardMenu/CommandActionTargetPicker.css`, `src/components/Popovers/StandardMenu/CommandActionSubcategoryMenu.tsx`, `src/components/Popovers/StandardMenu/CommandActionYouContents.tsx`, `src/hooks/useCommandActionTargets.ts`, `src/hooks/useCommandTargetDragging.ts`, `src/hooks/useCommandTargetSelection.ts`, `src/components/GearItemLabel.tsx`, `src/hooks/useCommandHelpMode.ts`, `src/utils/commandHelpUtils.ts`, `src/utils/logHelpUtils.ts` (target navigation follows Room → Entities/Objects/Exits/Shop; each exit shows whether it has a door; Scout belongs to Exits, while Doors actions appear only for exits marked with a door; You contains Inventory/Equipment/Skills; Global contains Group and Online Players; horizontal category bars hover-preview and click-pin without vertical layout shifts; help button and banner input enable command inspection mode with Details output) |
| **Command Input Target Suggestions** | `src/hooks/useCommandSuggestions.ts` prioritizes and marks the current target; `src/hooks/useCommandActionSuggestions.ts` and `src/utils/reverseCommandTargets.ts` reverse category → trait → button associations over the shared target model; `src/objects/doorActionTargets.ts` supplies room exits and door metadata to both views. Specialized/staged arguments retain `commandTargetSuggestionResolver.ts`. `useCommandSuggestionAppearance.ts` and `CommandSuggestionPopup.tsx` share category colors and show the Current target badge. |
| **Command Panel Mount Contents** | `src/components/Popovers/StandardMenu/CommandMountTarget.tsx`, `src/hooks/useCommandMountContents.ts`, `src/objects/mountObjectTargets.ts`, `src/stores/useCorpseContentsStore.ts`, `src/utils/mountCargoUtils.ts` (shared examine capture; `cat-mount-object` → `trait-mount-object` → `unsaddle %p %n`; cargo displays as an elevated floating popover without in-flow layout shift, supporting hover-preview and click-to-pin) |
| **Manage Sliding Docked Panels and the Desktop Client Panel Stack** | `src/utils/dockedPanelUtils.ts`, `src/components/Layout/MainContentLayer.tsx`, `src/components/Messages/ClientPanelStack.tsx`, `src/components/Messages/ClientPanelStackResizeHandle.tsx`, `src/stores/useClientPanelStackStore.ts`, `src/styles/terminalPanels.css`, `src/components/Help/HelpPanel.tsx`, `src/stores/useHelpStore.ts` |
| **Resize Command and Target Panels Independently** | `src/components/HUD/UnifiedCommandPanel.css`, `src/components/Drawers/DrawerResizeHandle.tsx`; widths use the existing `mume-desktop-layout-v2` persistence. The stacked Entities / Chat / Details column shares height through adjacent dividers. |
| **Character Console / Who Am I** | `src/components/HUD/ThisIsYouConsole.tsx`, `src/stores/useCharacterPanelStore.ts`, `src/components/HUD/ThisIsYouVitalsTier.tsx`, `src/components/HUD/ThisIsYouTerminal.css` |
| **Zone Colors & Highlights** | `src/utils/zoneColors.ts`, `src/styles/zoneFrame.css` (uniform client rim, brightness floor, and focused glow), `src/styles/immersionDamagePulse.css`, `src/hooks/useZoneThemeSync.ts`, `src/components/Messages/MessageLog.tsx`, `src/components/Messages/MessageLog.css` |
| **Map Room Info & Notes** | `src/components/Mapper/RoomInfoCard.tsx`, `src/hooks/useRoomInfoCard.ts`, `src/utils/roomInfoRoom.ts`, `src/utils/mapperRoomNotes.ts`. Notes are editable in play mode and saved with mapper state; preserve `notesEdited` so cleared notes do not reappear from imported map data. |
| **Map Markers & Room Icons** | `docs/map-annotations.md`, `src/hooks/useMapMarkerEditor.ts`, `src/components/Mapper/MapMarkerManager.tsx`, `src/utils/mapMarkerHit.ts`, `src/utils/deletedMapMarkers.ts`, `src/hooks/useRoomFlagEditor.ts`, `src/components/Mapper/RoomMapFlagsEditor.tsx`, `src/components/Mapper/performance/localMapEdits.ts`. The Room Info pencil opens a compact editor below existing badges with Add flag menus and removable room/exit flags. Preserve marker deletion tombstones and local room/exit flag overrides in both renderers. Worker marker hits must match worker text anchors and coordinate offsets. |
| **Corner Weather & Vignettes** | `src/components/Atmosphere/CornerWeather.tsx`, `src/components/Atmosphere/CornerWeather.css`, `src/components/Atmosphere/EnvironmentEffects.tsx`, `src/styles/environment.css` (sky weather at upper-right, fog at lower-right; heavy rain obscures stars; Performance Mode keeps cloud drift, reduced rain particles, and static fog, with snow suppressed). |
| **Corner Lighting Transitions** | `src/components/Atmosphere/EnvironmentVignetteLayers.tsx`, `src/components/Atmosphere/EnvironmentVignetteLayers.css`, `src/hooks/useEnvironmentTransitions.ts`; each scene retains its own lighting class, including the sun/moon corner. One frame clock blends scenes over one second; isolated `plus-lighter` blending prevents opacity dips. Dark/No Light room flags enter that clock as `blocksSky` scene metadata: fade stars and the blue sky vignette together, retaining outgoing sky visibility until its contribution reaches zero. Login and same-source updates stay static. `node scripts/verify_vignette_transition.mjs` checks browser pixels during and after fades. |
| **Cloud Entry & Sky Darkening** | `src/hooks/useEnvironmentSceneTransition.ts` synchronizes weather and light profiles over one second. `EnvironmentWeatherLayers.tsx` retains each scene's lighting colors; `CornerWeather.tsx` sweeps a cloud carrier into place using that progress while its child keeps the normal 140-second background drift. Sun/moon weather variants must be local classes, never global `:has()` rules. Corner sky layers remain visible during log scrolling and Performance Mode. |
| **Outdoor Dawn & Dusk Colors** | `src/components/Atmosphere/EnvironmentTwilight.tsx`, `src/hooks/useOutdoorTwilight.ts`, `src/utils/twilightAppearance.ts`, `src/utils/twilightSceneLayers.ts`; pass calibrated `gameTime` to `useEnvironmentTransitions`. Each transition lasts 60 real seconds, starting 30 seconds before and ending 30 seconds after the listed dawn/dusk time (`src/utils/solarTiming.ts`). Blend actual sun/night vignette and weather scenes plus stars over that window, with rose/coral/violet tint fading to zero at both endpoints. The cutoff lighting packet must not start a separate visual fade; room/source changes retain their current contributions. |
| **Sun Position in the Corner Sky** | `src/components/Atmosphere/SunDisc.tsx`, `src/hooks/useSunPosition.ts`, `src/utils/sunPosition.ts`, `src/utils/solarTiming.ts`, `src/components/Atmosphere/SunlightClouds.css`; use seasonal timing from the calibrated clock. The sun appears exactly at the listed dawn time and disappears exactly at the listed dusk time at the gradient horizon (approximately y=54% at x=94%): dawn 4 AM means sunrise 4 AM; dusk 10 PM means sunset 10 PM. Render it as a direct vignette-scene child, outside the corner sky mask, so the mask cannot erase the horizon sun; the scene still owns its room cross-fade and weather passes in front. Render only for `sun` lighting (including indoor terrain when sunlit); artificial light must never show a sun. |
| **Map Telemetry & Overlays** | `src/components/HUD/MapRoomInfoHeader.tsx`, `src/components/Settings/MapSettings.tsx`, `src/stores/useSettingsStore.ts` |
| **Map Find & Filter Controls** | `src/components/Mapper/MapFilterBar.tsx`, `src/components/Mapper/MapFilterCategories.ts`, `src/components/Mapper/MapFilterBar.css` |
| **Tactical Mobile Targeting** | `src/components/Controls/GameButton/TacticalTargetBar.tsx`, `src/components/Controls/GameButton/useTacticalTargeting.ts`, `src/utils/commandTargetUtils.ts` |

## Inline Action Model
The game calendar accepts pre-login MSSP Telnet status through `src/utils/telnet/msspTime.ts` and `onMsspTime` in the GMCP handler bundle. Use the epoch clock as fallback and keep manual time/clock and Event.Sun calibration; do not send `time` during login. MSSP has hour precision and uses zero-based game days.

Panel snapshots load on demand through `src/stores/usePanelDataStore.ts` and `src/hooks/usePanelData.ts`. Skills require explicit session sync via `SkillsSyncPrompt`; inventory/equipment load when their sections open. Successful manual captures also satisfy readiness. Keep spectate captures isolated from player readiness, and do not add login snapshot requests. Requests are serialized to protect the shared capture pipeline.

Preserve the server pager preference at login. `src/hooks/GameParser/useGameplayPager.ts` sends raw Return for active panel snapshots and silent captures; pager prompts must be intercepted before game-prompt boundary handling. Manual and snooped viewers stay interactive. Do not wrap captures in `change page off/simple` commands.

Opening the shop requests stock and a silent tracked `info %g` balance check through the panel snapshot queue. Reopening its dropdown checks gold again; buy/sell/mend responses refresh gold before stock. Gear sections start collapsed; shop transactions invalidate inventory readiness, refreshing immediately only if its subsection is visible and otherwise on the next subsection open.

Shop commands use the shared trait action header and syntax rows through `src/hooks/useCommandShopActions.ts`. Buy quantities reset on selection and are bounded by stock/server limits; `src/utils/shopPurchaseUtils.ts` calculates normalized coin totals, shown as upper estimates for grouped stock.

Inline log actions must always follow:

```text
inline entity -> category -> traits -> buttons
```

Categories classify entities and own default trait IDs. Traits own button IDs. Do not attach buttons or button sets directly to categories; legacy `inline-*` IDs are compatibility aliases during migration.

`src/components/Popovers/StandardMenu/InlineContainerGetAction.tsx` adds an optional Contents selector to Get on container targets. It loads contents with a silent tracked `look in`, always offers All, maps that choice to `get all from <container>`, and maps item choices to `get <item> <container>`. Container targets use this selector instead of a separate G/All action; worn containers also expose Get.

Inline container targets keep Look in the normal Examine trait. Its optional In toggle sends `look in <container>`; with the toggle off, Look sends `look <container>`.

## Shaper Mode
Shaper Mode is a privileged concept-building workspace, not a normal player-facing client mode. Keep its domain model, validation, collaboration, and deploy logic under `src/shaper/` as headless logic with thin components. Its entry point must remain hidden unless `canAccessShaper()` allows access.

## 🛠️ Team Lead Skill (Orchestrator Only)
Antigravity acts as the **Team Lead**, delegating background tasks to **Jules** via the Gemini CLI.
- **Skill**: `team-lead` (defined in `.gemini/skills/team-lead/SKILL.md`).
- **Delegation**:
  - **Antigravity (Tactical)**: UI, interactive debugging, immediate state fixes, code review.
  - **Jules (Background)**: Large refactors (>300 lines), full test suites, dependency audits.
- **Workflow**:
  1. `gemini -p "/jules [TASK]"` to launch.
  2. `git fetch origin && git merge origin/[JULES_BRANCH]` to integrate.
  3. Validate with `npm run build`.

## 🧪 Automated Testing Skill (Agent Only)
The Antigravity agent can log in autonomously to verify UI and logic changes.
- **Config**: Root `config.agent.json` (gitignored). Contains `account`, `password`, and `play_command`.
- **Character**: Use `ellessar` (God character) for testing.
- **Boot Sequence**:
  1. Open `http://localhost:3000`.
  2. Wait for `By what name...?`. 
  3. Enter Account Name.
  4. Wait for `Password:`. 
  5. Enter Password.
  6. Handle paginators/MOTD by sending empty newlines.
  7. Type `play ellessar` at the account prompt.
- **Verification**: Check `MessageLog.tsx` or the browser console for successful login triggers.

## 🚀 Efficiency Shortcuts for AI
- **GMCP over Text:** Always prefer GMCP data updates over regex-parsing game text when possible.
- **Surgical Edits:** Use the `replace` tool by targeting the `// --- Section ---` comments.
- **Validation:** Always verify changes by checking for TypeScript errors and running a build.

## 🔄 Self-Updating Requirement
When you add a major feature or change a core API, you **MUST** update:
1.  `ARCHITECTURE.md` (if standards change)
2.  `GEMINI.md` (if CLI-specific discovery paths change)
3.  This file (`AGENTS.md`) (if the "Mental Model" or "Strategic Map" changes)

---
*Created for the MUME AI Studio App to empower autonomous engineering.*


## Command Panel V2
The default command workspace is command-first: six root groups (bottom strip on desktop, horizontal bar on mobile) (Abilities, Movement, Vision, Objects, Social, Character) -> one menu with organizational section headers and commands -> valid targets. `CommandPanelV2.tsx` renders the tree; `useCommandTree.ts` owns navigation and trait-based target filtering; `useCommandTreeController.ts` reuses execution, captures, chat, shop and practice. Quick Mood, Cast Speed, Alertness and Stance controls remain visible. Root category hovers switch immediately; nested hover previews wait 180 ms; clicks and keyboard focus open immediately. `UnifiedCommandPanel.tsx` offers a persistent Legacy switch to `UnifiedCommandPanelLegacy.tsx`. Frozen V1 references and restoration notes are in `docs/archive/command-panel-v1/`.

V2 cascades size to their content across the viewport, anchored at the right edge; only the root reserves a log lane. Fixed-width branches scroll horizontally only after reaching the viewport boundary. `scripts/verify_command_tree_layout.mjs` checks this geometry. Keep command catalogs and communication choices memoized: target eligibility is indexed by trait and cached until target, ability, or eligibility data changes. `useCommandTree.performance.test.tsx` guards reuse during navigation.

Items & Equipment intentionally uses a location-first branch: Equipment / Inventory / Room -> actual object -> context-valid actions, with Shop alongside locations. `useCommandTreeItems.ts` owns this navigation and loads gear only for the open location; `CommandTreeItems.tsx` renders it. Preserve the item-first branch when editing the command-first workspace.

V2 intermediate categories are noninteractive section headers, never extra menu levels. `CommandTreeSections.tsx` shows all sections in one menu per main group. `CommandTreeItems.tsx` shows Equipment / Inventory / Room object sections together in that same menu, with contextual actions branching directly from an object. Opening Items loads both visible gear sections on demand.

Items now follows commands first: Items & Equipment opens equipment, item movement, usage and shop command sections; hover Remove / Wear / Drop / Get etc. for valid object targets. `CommandTreeSections.tsx` renders this alongside the other four groups. Gear loads on demand when Items opens. Equivalent button templates share the union of eligible targets, while Remove is limited to worn items and Wear / Drop to carried items. Target rows display the item name while preserving the original command behavior. This supersedes the earlier location-first Items branch notes.

V2 uses `PopoverActionButton` with `treeRow` for native flat command rows; syntax is shown in tooltips rather than inline. `CommandTreeCommandList` uses the same row class for target-opening commands. Preserve UTF-8 encoding in V2 source files to prevent broken chevrons. `PopoverActionButton.tree.test.tsx` checks presentation and execution; the layout verifier also compares row geometry.

Command tree rows use `commandTreeIdentity.ts` to merge saved/generated spell variants by spell identity and ordinary commands by normalized syntax. Prefer generated ability buttons and union eligibility across their equivalent source variants; class-navigation buttons are excluded from the executable catalog.

Abilities uses ordered section headers: Combat action, Mage, Warrior, Cleric, Thief, Ranger, Training. Class ability metadata keeps learned skills together under that root. Each section command list shows up to five 33px rows before scrolling independently. Cascade height fills the dock down to the client bottom. V2 labels reuse `getSwipeCommandTextColor` and `getInlineTraitTextColor` for the shared offensive/buff/healing palette.

V2 Shop is a fixed five-command section: Buy, Sell, Value, Compare, Show. `commandTreeShop.ts` defines its entries; `useCommandTreeShopTargets.ts` routes stock/carried-item selection through the existing shop capture and transaction handlers. Buy retains explicit quantity and purchase confirmation. Compare selects a stock item first, then stock or carried/worn gear. Legacy browse/mend rows are excluded from the V2 command catalog.

Training disclosure state is owned by `useCommandPracticeGroups.ts`; toggle handlers pass a captured boolean and same-value updates return the previous state. Never retain React events inside deferred state updaters. V2 training visibility follows the selected group; external practice-open requests are separate navigation events. `CommandPanelV2` uses `@refresh reset` to remount safely when custom-hook layouts change during development.

V2 Abilities → Training has one Practice Skills command (`commandTreePractice.ts`). Its available guild skills and selected-skill confirmation render in `CommandTreePracticeTargets.tsx` as a left-hand target cascade, never inline in the main command list. Training readiness opens only while the Practice command is active. `useCommandTreePracticeTargets.ts` clears stale previews before selecting a skill through the existing practice handler.

Practice Skills remains available away from guildmasters: opening requests the normal `practice` snapshot through the panel queue and exposes known abilities as targets. Only a fresh current-guild catalog enables actual training.

Movement includes a Go command on desktop and mobile whose left submenu reuses `MovementPad` with the `menu` layout (six directions, live exits). Opening Movement shows command rows; only hovering, focusing or clicking Go opens the direction pad. `useCommandTreeMovement.ts` handles movement/help execution; `CommandTreeMovement.tsx` renders the branch. Map and panel pad layouts remain shared.

V2 Look, Examine and Consider live under Observation. `commandTreeObservation.ts` supplies local targets grouped into directions, room entity kinds, room objects, equipment and inventory; Look adds an In target that opens the local container cascade (`look in <container>`), instead of listing Look In as a separate command. Opening these commands requests gear snapshots. `useCommandTreeObservation.ts` executes against the clicked target and starts the existing Details capture directly. Remote group members are excluded.

V2 shares Open/Close/Lock/Unlock/Pick via `commandTreeAccess.ts`: Move & Explore → Doors & Containers includes actual door exits and local containers; Objects & Equipment → Containers uses container-only aliases. Scout belongs in Move & Explore → Explore. Targets are grouped by Doors, Room containers, Inventory containers and Equipped containers. Container recognition uses existing gear flags, entity capabilities and resolved container traits. Both entry points load personal gear on demand and reuse normal target action execution.

V2 mount actions split by task: `commandTreeMountSection` places Ride/Dismount/Lead/Abandon in Move & Explore → Mounts (immediately after Movement), including learned Ride variants; Saddle/Unsaddle belong to Objects & Equipment → Mount equipment. Existing target filtering and execution remain shared.

V2 access commands are visible only with eligible local targets. Knock shares the access submenu but accepts actual doors only and has no Containers alias. Open/Close/Lock/Unlock/Pick accept doors and recognized room/carried/worn containers; container-only aliases use their own filtered target cache. Opening Move & Explore also requests gear snapshots so carried/worn container availability can be determined before showing actions. An access submenu closes if its last eligible target disappears.

V2 consolidates Drink and Drink Water into one Drink action. `commandTreeDrink.ts` projects the existing `getDrinkTargetSuggestions` into tree targets (inventory/equipment fluid containers and room water); `useRoomDrinkWater` supplies live water terrain/map-flag detection. No duplicate standalone Drink Water row is shown.

Empty is a container-only V2 command in Objects & Equipment → Containers. It uses the shared local container targets (room, inventory, equipment), including fluid containers recognized by capabilities, names or resolved traits; it never targets doors and hides when no eligible container is present.

V2 Camp commands (including Camp Rent) belong to Objects & Equipment → Use items, rather than Move & Explore.

V2 door action targets display the GMCP door name (falling back to the current mapped door name, then Door) with a short direction, e.g. trapdoor (d). `useCommandTreeAccessTargets.ts` keeps labels separate from explicit execution syntax: close/open/lock/unlock/pick/knock exit <direction>.

V2 Put uses a staged cascade: Put → inventory object (including All) → equipped/inventory/room containers. Give uses the same source cascade before choosing a room recipient. `useCommandTreeTransfer.ts` reuses shared gear/container selectors, excludes the selected object as its own destination and executes only after a destination click through normal button handling. Drop/Get/Wear/Remove target menus include All when matching targets are available; legacy G/All buttons are omitted from V2. Get also exposes From → Room/Inventory/Worn → container or corpse → contents, then sends `get <item> <container>` (or the corresponding all syntax); `useCommandTreeGetFrom.ts` shares container and corpse content captures. `CommandTreeTransferTargets.tsx` supports delayed hover and immediate click/focus, with the extra branch expanding to the left.

V2 Give shares the staged transfer cascade with Put: Give → hover inventory object → choose a room recipient. Recipient sections use only local room characters (NPCs, allies, enemies, neutrals, mounts, players), excluding self and remote group members. `useCommandTreeTransfer.ts` validates the source and destination at click time and reuses normal button execution; only the final click sends give <object> <recipient>.

Desktop command docking uses slots in MainContentLayer.tsx and LogDockedInput.tsx. CommandPanelV2.tsx portals the character summary and quick controls into the map region, keeps command input aligned with the log, and fills the remaining right region with category buttons. CommandDockStrip.css owns the full-width bottom grid; category menus anchor above their button and additional columns extend left.

Desktop entities, chat, inline actions, details, and help share the right-side column beside the log. ClientPanelStack.tsx orders the visible panels; useClientPanelStackStore.ts saves order, height shares, and single-panel heights, and appends new panels when restoring older layouts. Inline entity menus portal into the Actions slot; the command-panel surface variables keep it dark brown in regular mode, black in immersion mode, and gray in Performance Mode, including immersion Performance Mode. Drag the gap between two panels to transfer height; when only one panel is open, drag its bottom resize handle or use arrow keys to adjust its single-panel height, and drag the small grip or use its arrow keys to reorder panels. ChatTranscriptWindow.tsx, GroupStatusWindow.tsx, CapturedDetailsSidePanel.tsx, and HelpPanel.tsx keep independent scrolling inside their stack slots. HelpPanelStack.css styles the borderless stacked Help surface; desktop Help never reserves a separate lane or replaces the active command panel. Mobile retains its existing panel layout.

ParleyChannelChip.tsx and useParleyChannelMenu.ts share the destination cascade between ChatCommunicationBar.tsx and LogDockedInput.tsx: hover the chip for channels, hover Tell/Whisper/Ask for recipients, then select a recipient to commit both. Tell uses online players; Whisper/Ask use shared room-character entries and exclude self. Non-directed channels commit on click. Menus open upward with recipient columns to the left, retain click/focus access, and never send messages during destination selection.

Nested command, inventory/equipment, and parley menus use menuVerticalPlacement.ts to choose upward or downward placement based on available viewport space. Nested columns stay aligned with their parent row; the chosen side also bounds their scroll height. useUpwardCommandBranches.ts retains its existing name but now supports both directions.

Equipment and Inventory quick menus use `useCommandGearQuickMenu.ts` for backwards selection: container → optional contained item → action. Mobile reserves two of six columns each for actions, contents, and gear when a container is open; without contents, actions and gear share the width. Contained items use `cat-container-item` with the explicit parent noun and preserve indexed selectors for commands such as `get 2.sword backpack`. Selecting the parent again restores its own actions without sending a command.

The header's former Group panel is now an Entities window. GroupStatusWindow.tsx renders Group Members and Room Entities sections; useRoomEntitiesPanel.ts projects shared room-character entries, keeps listed group members out of the other-entities section, and updates selected-target metadata plus the current target without executing game actions. GroupTableView.tsx supports an optional member-selection callback. Existing floating group geometry/preferences remain compatible.

Entities-panel selection follows canSetTargetChipFromCategory: only NPCs and enemies become the command target. Their active row shares the command-chip red highlight and crosshair indicator; selecting other characters updates selection without changing the command target.

Action target rows share currentCommandTarget.ts for NPC/enemy current-target matching, red highlighting, and crosshairs. CommandTreeCommandList.tsx uses commandDefaultTarget.ts to execute a clicked command against the current target only if targetsFor(button) includes it; otherwise it opens target selection. Hover/focus still previews alternatives. Observation defaults reuse executeCommandTreeObservation so Look/Examine/Consider retain Details capture, and Help/spectate restrictions remain enforced.

Beneficial abilities (buffs, heals, and ally support skills) are excluded from combat-target defaults and auto-aim crosshairs through friendlyTargetCommand.ts. They retain explicit submenu recipient selection; classification uses shared ability families rather than command text color.

On mobile, an open V2 command guide portals into the command bar slots as an in-flow four-row console: command input, one six-button action row, one six-button state/equipment/inventory row, then character info. CommandDockStrip.css uses explicit six-column grids to prevent wrapping and keeps mobile menu widths inside the viewport. The separate desktop three-region strip and rotated-landscape layout retain their own geometry.

Mobile minimaps render their canvas directly at the preview frame size in KeyboardMapPreview.css, without scaling or cropping a larger map surface. The renderer observes these native bounds; the frame owns the edge fade. useMapperInteractions.ts pans the compact map with one finger instead of invoking movement gestures. The initial mobile camera zoom is DEFAULT_MOBILE_MAP_ZOOM (0.7) in mapperUtils.ts; desktop camera defaults are independent.

Command panel eligibility prepares `getEligibleActionButtonIds` from `src/utils/actionUtils.ts` once per target and passes the resulting set to `isButtonValidForEntity`. Keep these sets scoped to a single rebuild so trait edits, character restrictions, and room changes remain live. `useCommandTree.ts` memoizes catalog normalization separately from target eligibility. Regression coverage lives in `src/utils/actionUtils.performance.test.ts` and `src/hooks/useCommandTree.performance.test.tsx`.


## Mobile Command Performance
Mobile readability command menus use three fixed lanes in the bottom half: commands, first targets, then second targets. `CommandDockMobileFocus.css` keeps each menu in a two-column button grid with independent vertical scrolling; the log remains visible above. Tap a targeted command to open its existing target branch, then tap a target to execute. Commands without targets execute directly. Execution keeps the menus open regardless of pin state. Desktop and regular mobile retain their existing interactions.
`useCommandDockPosition.ts` schedules measurements only for open menus and ignores unrelated log scrolling. Preserve equal-position state reuse and the branch aligner's cached transform offsets. Root menus start at the bottom on category changes, not on each eligibility refresh. Touch must not schedule desktop hover previews. Ordinary text uses run spans when word effects are inactive. PERF includes command-dispatch-to-socket, text queue wait, total chunk processing (including worker waits), and socket backlog; these are not network RTT or paint latency. See `docs/webcockpit-performance-review.md`.
