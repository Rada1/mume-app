# MUME App Refactor Blueprint
This document describes a phased migration from the current monolithic `GameContext` architecture to a store-based architecture with a typed GMCP event bus. It is designed to be executed by multiple agents working asynchronously without stepping on each other.

---

## Background: Why we are refactoring

The codebase has five structural problems that cause constant regressions:

1. **Deps god object** — `GameContext.tsx` (1,441 lines) assembles a 130+ property object and pipes it into every parser hook. Any rename, addition, or removal silently breaks downstream consumers.
2. **Type fragmentation** — The same concepts are defined in `src/types/index.ts`, `src/context/GameContext/types.ts`, `src/context/GameContext/state.ts`, and per-hook `Deps` interfaces. Fixing a type in one place leaves it wrong in the others.
3. **Dual state trees** — A `userSession` and a `spectateSession` are maintained side by side. Every GMCP handler must explicitly pick which to update; missed ternaries write to the wrong tree.
4. **Callback-slot registration** — 18+ `setOnX`/`onX` slots get filled at runtime. No ordering guarantees, no payload validation, silent failures.
5. **Large commits, no integration tests** — Recent commits touch 20+ files each. Nothing catches when a consumer falls out of sync with the data it expects.

---

## Target architecture (end state)

```
Telnet/Network layer
      │
      ▼
 GmcpDecoder — parses packets
      │
      ▼
 gmcpBus — typed event emitter  ◄─── single source of truth for network events
      │
  ┌───┴───┬─────────┬──────────┬──────────┐
  ▼       ▼         ▼          ▼          ▼
 Vitals  Room     Combat    Audio      UI stores
 store   store    store     store      (Zustand)
  │       │         │          │          │
  └───────┴─────────┴──────────┴──────────┘
                      │
                      ▼
             React components
       (subscribe only to slices they need)
```

Key properties:

- Each store owns one domain. No store reaches into another.
- Components subscribe to the minimal slice they render.
- GMCP packets enter the system in exactly one place (`gmcpBus.emit`) and fan out via subscriptions.
- Spectate mode is handled by a single `useActiveGameState()` selector that reads `useModeStore.isSpectating` and returns the correct slice.
- Pure parser functions replace the current hook-heavy parsing pipeline.

---

## Phase status

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Groundwork: event bus, first store, parallel emission | **DONE** |
| 1 | Extract `useNetworkStore` | Ready |
| 2 | Extract `useAudioStore` | Ready |
| 3 | Extract `useVitalsStore` (subscribes to bus) | Ready |
| 4 | Extract `useRoomStore` | Ready |
| 5 | Extract `useCombatStore` | Ready |
| 6 | Extract `useUIStore` | Ready |
| 7 | Introduce `useActiveGameState` selector + unify dual session trees | Needs Phase 3+5 |
| 8 | Convert parsers from hooks to pure functions | Needs Phase 3–6 |
| 9 | Delete `GameContext` god object; replace with slim provider | Needs all above |
| 10 | Consolidate types; delete duplicate `types.ts` files | Needs Phase 9 |
| 11 | Add integration tests for golden paths | Can run parallel to Phase 1+ |

Phases 1, 2, 3, 4, 5, 6, and 11 can be done in parallel by different agents. Phases 7, 8, 9, 10 are sequential.

---

## Phase 0: DONE (reference)

Work completed in the groundwork session:

- Deleted `src/hooks/useInteractionHandlers.ts.bak` and `.ts.tmp`.
- Installed `zustand` (v5).
- Created `src/events/gmcpBus.ts` — typed event bus for every GMCP packet.
- Created `src/stores/useModeStore.ts` — pattern template for all future stores.
- Modified `src/hooks/useTelnet.ts` to emit on `gmcpBus` in parallel with existing callbacks. Old code paths still fully functional.

**The parallel-emission pattern is the key enabler for every downstream phase.** Consumers can migrate to the bus one at a time without touching the old handler chain.

---

## Rules every agent must follow

1. **Additive only.** Do not delete or replace any existing code until the replacement is proven to work via a parallel path.
2. **One store per PR.** Do not combine multiple stores in a single change.
3. **No cross-store reads.** A store must never import another store. Cross-store coordination happens in components or effects, not in store logic.
4. **Type-safe bus payloads.** If you need a new event, add it to `GmcpEventMap` in `src/events/gmcpBus.ts` first, then emit from `useTelnet.ts`, then subscribe.
5. **Build must pass at every commit.** Run `npm run build` before finishing.
6. **No edits to `GameContext.tsx` until Phase 9.** Until then, the context stays intact and stores run beside it.
7. **Stores live in `src/stores/<name>.ts`.** One file per store.

---

# Agent prompts

Each section below is a self-contained prompt. Copy it verbatim into a fresh agent session. Each prompt assumes the agent has no context from this conversation.

---

## Agent prompt: Phase 1 — `useNetworkStore`

```
You are working on the mume-app React/TypeScript codebase. You are executing Phase 1 of a refactor documented in REFACTOR_BLUEPRINT.md at the repo root. Read that document first.

Your task: create src/stores/useNetworkStore.ts — a Zustand store that owns network/connection state. Do not modify any existing files except to add the store.

Scope:
- State fields: status ('connected' | 'disconnected' | 'connecting'), connectionUrl (string | null), lastError (string | null), isBackgrounded (boolean).
- Actions: setStatus, setConnectionUrl, setError, clearError, setBackgrounded.
- Export a `getNetwork = () => useNetworkStore.getState()` helper (see useModeStore for the pattern).

Constraints:
- Do NOT import from GameContext, useTelnet, or any other hook.
- Do NOT wire any consumer yet — this is pattern scaffolding only.
- Must pass `npm run build`.

Deliverable: one new file, src/stores/useNetworkStore.ts. Report what you created and confirm the build passed.
```

---

## Agent prompt: Phase 2 — `useAudioStore`

```
You are working on the mume-app React/TypeScript codebase. You are executing Phase 2 of a refactor documented in REFACTOR_BLUEPRINT.md at the repo root. Read that document first.

Your task: create src/stores/useAudioStore.ts — a Zustand store that owns audio suppression flags and zone music state. Do not modify any existing files except to add the store.

Research first:
- Read src/hooks/useSoundSystem.ts and src/hooks/useGameAudio.ts to understand what state they expose.
- Read lines 370–410 of src/context/GameContext.tsx to see the current suppression logic (`checkSuppression`, `isSilentReplayRef`).
- Read src/hooks/useZoneMusic.ts briefly.

Scope of the store (state only — not the sound-playing functions themselves):
- isSuppressed (boolean) — combined flag computed from replay mode + silent rehydration + speed > 1
- isSilentReplay (boolean)
- replaySpeed (number)
- currentZone (string | null)
- isSoundEnabled (boolean) — mirrors settings
- Actions to set each of the above.

Constraints:
- Do NOT move the sound-playing functions yet (rawPlaySound etc.). Those stay where they are until Phase 8.
- Do NOT modify GameContext.tsx.
- Do NOT import other stores.
- Must pass `npm run build`.

Deliverable: one new file, src/stores/useAudioStore.ts. Report what you created and confirm the build passed.
```

---

## Agent prompt: Phase 3 — `useVitalsStore` (first bus consumer)

```
You are working on the mume-app React/TypeScript codebase. You are executing Phase 3 of a refactor documented in REFACTOR_BLUEPRINT.md at the repo root. Read that document first. Also read src/events/gmcpBus.ts.

Your task: create src/stores/useVitalsStore.ts — a Zustand store that owns character vitals (hp/mana/move/position/combat status), and have it subscribe to the 'Char.Vitals' event on gmcpBus. Do NOT modify any existing files except to add the store.

Research first:
- Read src/hooks/useGmcpHandlers/useGmcpVitals.ts — this is the current handler; your store's logic must match it behaviorally.
- Read the GmcpCharVitals type in src/types/index.ts.
- Read src/stores/useModeStore.ts — use it as the code-style template.

Scope of the store:
- State: hp, maxHp, mana, maxMana, move, maxMove, hpStatus (CombatHealthStatus | null), position (string), inCombat (boolean), opponent (string | null), opponentStatus, currentTerrain, weather, isFoggy.
- Action: applyCharVitals(data: GmcpCharVitals) — mirrors the logic in useGmcpVitals.ts. Preserves the "don't let 'standing' stomp 'riding'" rule. Preserves the "strict clearing signal" rule when opponent is null/empty.
- Auto-subscribe: at the bottom of the file, call `gmcpBus.on('Char.Vitals', (data) => useVitalsStore.getState().applyCharVitals(data))`. This registers the subscription at module load.

Constraints:
- Only write TO the new store; the old useGmcpVitals hook continues running untouched. Both paths update in parallel.
- Do NOT import from GameContext.
- Do NOT import other stores except useModeStore if you need to check spectate mode (see below).
- If `useModeStore.getState().isSpectating` is true, the store should still apply vitals — because in the target architecture, spectate mode reroutes vitals at the selector layer (Phase 7), not at the write layer. DO NOT branch on spectate mode inside this store.
- Must pass `npm run build`.

Deliverable: one new file, src/stores/useVitalsStore.ts. Report what you created, which fields you included, and confirm the build passed.
```

---

## Agent prompt: Phase 4 — `useRoomStore`

```
You are working on the mume-app React/TypeScript codebase. You are executing Phase 4 of a refactor documented in REFACTOR_BLUEPRINT.md at the repo root. Read that document first. Also read src/events/gmcpBus.ts.

Your task: create src/stores/useRoomStore.ts — a Zustand store that owns room state (name, description, terrain, exits, players, npcs, items). Subscribe to the relevant bus events.

Research first:
- Read src/hooks/useGmcpHandlers/useGmcpRoom.ts and useGmcpOccupants.ts.
- Read GmcpRoomInfo, GmcpOccupant, GmcpUpdateExits in src/types/index.ts.

Scope:
- State: roomName, roomDesc, roomZone, terrain, exits (string[] or Record<string,any>), players (GmcpOccupant[]), npcs (GmcpOccupant[]), items (GmcpOccupant[]).
- Actions: applyRoomInfo, applyExitsUpdate, setPlayers, setNpcs, setItems, addPlayer, removePlayer, addNpc, removeNpc, clear.
- Subscribe at module load:
  - 'Room.Info' → applyRoomInfo
  - 'Room.UpdateExits' → applyExitsUpdate
  - 'Room.Players' → setPlayers
  - 'Room.Npcs' → setNpcs
  - 'Room.Items' → setItems
  - 'Room.AddPlayer' → addPlayer
  - 'Room.RemovePlayer' → removePlayer
  - 'Room.AddNpc' → addNpc
  - 'Room.RemoveNpc' → removeNpc

Constraints:
- Parallel with existing handlers. Do NOT remove the old ones.
- No cross-store imports except useModeStore if needed.
- Must pass `npm run build`.

Deliverable: src/stores/useRoomStore.ts. Report and confirm build.
```

---

## Agent prompt: Phase 5 — `useCombatStore`

```
You are working on the mume-app React/TypeScript codebase. You are executing Phase 5 of a refactor documented in REFACTOR_BLUEPRINT.md at the repo root. Read that document first. Also read src/events/gmcpBus.ts.

Your task: create src/stores/useCombatStore.ts — a Zustand store for combat metadata separate from raw vitals.

Research first:
- Read src/hooks/useGmcpHandlers/useGmcpVitals.ts (specifically onRoomCharsCombat) and useGmcpGroup.ts.

Scope:
- State: opponentId, opponentName, opponentHealthStatus, bufferName, bufferHealthStatus, groupMembers (GroupMember[]).
- Actions: setOpponent, setBuffer, applyRoomCharsCombat, applyGroupUpdate, applyGroupRemove, applyGroupAdd, applyGroupSet.
- Subscribe at module load to:
  - 'Char.Opponent' → setOpponent
  - 'Char.Buffer' → setBuffer
  - 'Room.CharsCombat' → applyRoomCharsCombat
  - 'Group.Add' / 'Group.Update' / 'Group.Remove' / 'Group.Set' → respective actions

Constraints:
- Must not duplicate hp/position from useVitalsStore. That lives in Vitals, not Combat.
- No cross-store imports except useModeStore if needed.
- Must pass `npm run build`.

Deliverable: src/stores/useCombatStore.ts. Report and confirm build.
```

---

## Agent prompt: Phase 6 — `useUIStore`

```
You are working on the mume-app React/TypeScript codebase. You are executing Phase 6 of a refactor documented in REFACTOR_BLUEPRINT.md at the repo root. Read that document first.

Your task: create src/stores/useUIStore.ts — a Zustand store for UI-only state (open panels, popovers, modals).

Research first:
- Grep src/context/GameContext.tsx for: isCharacterOpen, isStatsOpen, isInventoryOpen, isEquipmentOpen, isPlayersOpen, popoverState, mumeEditState. Those are the candidates.

Scope:
- State: isCharacterOpen, isStatsOpen, isInventoryOpen, isEquipmentOpen, isPlayersOpen, popoverState, mumeEditState, isNewbieMode.
- Actions: setters + open/close helpers where they make sense (e.g. openCharacter(), closeCharacter()).

Constraints:
- No bus subscriptions for this store — UI state is driven by components, not network events.
- No cross-store imports.
- Must pass `npm run build`.

Deliverable: src/stores/useUIStore.ts. Report and confirm build.
```

---

## Agent prompt: Phase 7 — `useActiveGameState` selector + dual-tree unification

```
You are working on the mume-app React/TypeScript codebase. Phases 3 and 5 must already be complete. Read REFACTOR_BLUEPRINT.md and the following stores: useVitalsStore, useCombatStore, useRoomStore, useModeStore.

Your task: introduce src/stores/useActiveGameState.ts — selectors that transparently return either the user's game state or the spectated player's game state depending on useModeStore.isSpectating.

Constraints:
- Create a SECOND set of stores: useSpectateVitalsStore, useSpectateCombatStore, useSpectateRoomStore. These subscribe to the bus ONLY when isSpectating is true (use a toggle effect in a top-level component or a runtime switcher). They mirror the shape of their non-spectate counterparts.
- The useActiveGameState selectors (e.g., useActiveVitals()) return the spectate store slice when isSpectating, else the main store slice.
- Components that render vitals/room/combat should migrate to the selector hooks ONE AT A TIME in subsequent PRs. Do not migrate them all in this phase.

This is the most delicate phase. Go slow. Pair with the user before rolling it out widely.

Deliverable: selector module + spectate-mirror stores. Build passes.
```

---

## Agent prompt: Phase 8 — Pure-function parsers

```
You are working on the mume-app React/TypeScript codebase. Phases 3–6 must be complete.

Your task: migrate src/hooks/GameParser/* from hook-based parsers to pure functions.

Target shape:
- Each parser is `(line: string, context: ParserContext) => ParsedEvent[] | null`.
- ParserContext is a small readonly object: { isSpectateMode, sessionMode, characterName, roomDescRef }. No setters, no deps object.
- A ParsedEvent is a discriminated union (e.g. { type: 'vitals'; data: Partial<VitalsState> }).
- The thin orchestrator hook (kept for lifecycle only) runs parsers, then dispatches each event to the appropriate store's action.

Research:
- useGameParser.ts (936 lines) is the orchestrator. Note its many sub-hooks.
- Sub-parsers: useAtmosphereParser, useLogGmcpParser, usePracticeParser, etc.

Approach:
- Start with useAtmosphereParser (smallest, most self-contained). Prove the pattern.
- Then useLogGmcpParser.
- Finally the main useGameParser.

Constraints:
- Each parser migration is a separate PR.
- Old parsers stay running in parallel until every consumer is on the new path.
- Must pass build at each PR.

Deliverable: one sub-parser migrated. Agent should stop after the first migration and report for user review.
```

---

## Agent prompt: Phase 9 — Dismantle GameContext

```
DO NOT START this phase until phases 1–8 are complete and all consumers have been migrated to stores. This is the destructive phase.

Your task: reduce src/context/GameContext.tsx to a minimal provider that only holds non-store state (refs that don't belong in Zustand, IO hook instances like useTelnet, and bootstrapping logic).

Approach:
- Audit every field in the current GameContextType. For each:
  - If a store owns it → delete from context, update consumers to useXStore instead.
  - If it's a ref or instance (telnet, mapperRef) → keep in context.
  - If it's a derived/computed value → move to a selector hook.

Expected end state:
- GameContext.tsx < 200 lines.
- No `deps` god objects being passed around.
- No dual-tree conditionals; all spectate routing goes through useActiveGameState.

This phase will likely take multiple sessions. Pair closely with the user.

Deliverable: incremental PRs shrinking the context.
```

---

## Agent prompt: Phase 10 — Type consolidation

```
Phase 9 must be complete.

Your task: merge src/types/index.ts (736 lines), src/context/GameContext/types.ts (539 lines), src/context/GameContext/state.ts, and per-hook Deps interfaces into a single src/types/ folder organized by domain.

Target:
- src/types/gmcp.ts — all Gmcp* packet types (straight move from index.ts).
- src/types/game.ts — GameStats, CombatHealthStatus, Position, WeatherType, LightingType, etc.
- src/types/entities.ts — GmcpOccupant, GroupMember, CharacterInfo, GameEntity.
- src/types/ui.ts — MessageType, PopoverState, MumeEditState, etc.
- src/types/index.ts — re-exports everything for backwards compat.

Delete per-hook Deps interfaces. Hooks should accept store slices via Pick<StoreShape, ...> where needed.

Deliverable: reorganized types, all imports still resolve, build passes.
```

---

## Agent prompt: Phase 11 — Integration tests (parallel track)

```
You are working on the mume-app React/TypeScript codebase. This phase can run in parallel with phases 1–6.

Your task: set up integration tests for three golden paths that will catch regressions during the refactor.

Research:
- Check what test framework is already present (look at package.json). Playwright is set up for UI tests (playwright.config.ts).
- Prefer vitest for unit/integration tests of stores and parsers.

Tests to add:
1. GMCP Char.Vitals round-trip:
   - Emit a GmcpCharVitals payload on gmcpBus.
   - Assert useVitalsStore.getState() reflects the update.
2. Login flow simulation:
   - Given a sequence of telnet lines (name prompt → password prompt → MOTD), assert that useSessionManager's prepareLoginAttempt sends the right commands at the right times.
3. Spectate mode toggle:
   - Given isSpectating=false, Char.Vitals updates main store.
   - Given isSpectating=true, Char.Vitals updates spectate store (Phase 7).

Constraints:
- Install vitest if not present.
- Tests live in src/stores/__tests__/ or similar.
- Do NOT test implementation details — test observable behavior through the bus and store getters.
- Run tests as part of `npm run build` or a new `npm test` script.

Deliverable: at least one passing integration test + test infrastructure.
```

---

## What to tell agents about scope

When you hand an agent one of these prompts, also include:

> **Do not expand scope beyond the phase described. If you find yourself wanting to fix something in another file, stop and ask the user first.** The refactor succeeds by being additive and incremental; the worst thing an agent can do is "while I'm here, let me also fix…".

---

## Current repo state (as of Phase 0 completion)

- `src/events/gmcpBus.ts` — created, exports `gmcpBus` singleton
- `src/stores/useModeStore.ts` — created, pattern template
- `src/hooks/useTelnet.ts` — emits on bus parallel to callbacks (additive change)
- `src/hooks/useInteractionHandlers.ts.bak` and `.tmp` — deleted
- `package.json` — zustand@5 added
- Build status: passing

Nothing else has changed. All existing code paths continue to work.
