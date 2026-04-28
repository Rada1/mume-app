# Replay & Recording System Redesign

## Status: IN PROGRESS — Phase 6 next (Phase 5 complete)

---

## Design Goals

### 1. Always-On Recording
- Recording is **automatic and silent** — no user action required
- **User session**: starts on connect, saves to IndexedDB on disconnect
- **Spectate session**: starts on spectate-start, saves on spectate-end
- Periodic IndexedDB flushes for crash recovery (every N seconds or M entries)
- Logs tagged with `type: 'user' | 'spectate'`, character name, start time
- User manages storage via the Library (delete what they don't want — no auto-expiry)
- Short sessions are still saved — no minimum duration threshold

### 2. Fully Sandboxed Replay Session
- Replay gets its own session slot: `'replay'` (alongside `'user'` and `'spectate'`)
- When a replay is active, `MessageLog` switches to the replay session's message store
- The live log is **hidden, not destroyed** — returns intact when replay is dismissed
- Replayed GMCP/state only updates the **replay session context** — live state is never touched
- Works identically for user logs and spectate logs — a log is a log

### 3. Theater Mode / ReplayHUD Trigger
- **Theater mode is ONLY triggered by selecting a replay in the Library**
- Scrolling up in the live log no longer triggers theater mode
- ReplayHUD controls: scrubber, speed (1x/2x/5x), search, trim, export, timeline markers

### 4. Spectate Live Buffer (`useSpectateBuffer`)
- Ephemeral in-memory log — not persisted
- Recorder and buffer are **independent consumers** of the incoming snoop feed
- Recorder always writes at live time; buffer controls the viewing offset
- Minimal UI: buffer size selector, lag indicator, "jump to live" button
- Completely separate from the replay system

### 5. Death Flagging & Timeline Markers
Two flag types baked into `SessionLog` entries during recording:

| Flag | Detection | Color on scrubber |
|---|---|---|
| `death_self` | Line contains `"You are dead!"` | Red |
| `death_enemy_player` | Line matches `/^\*[^*]+\* has drawn his last breath! R\.I\.P\./` | Gold |

- NPC deaths are **not flagged**
- Flags stored as `{ t: offset, typ: 'flag', d: { kind: 'death_self' | 'death_enemy_player', name?: string } }`
- ReplayHUD shows colored dots on the scrubber at flag timestamps
- Clicking a marker seeks to that point
- Retroactive flagging: existing logs are rescanned on `loadLog()` for backwards compatibility

### 6. Session Separation Rules
- **User recorder**: only receives user's own rx/tx — never snooped data
- **Spectate recorder**: only receives snooped rx/gmcp — never user's own tx
- If user is spectating and has a live buffer running, recording still writes at **live time** (not delayed)
- Spectate logs are fully separate from user logs in the Library

### 7. Library UI
- Shows complete session history (user and spectate logs)
- Logs distinguished by `type` badge and character name
- User can delete individual logs
- No auto-expiry

---

## Log Format

```ts
// Existing — no changes needed to core format
interface SessionLog {
  version: 1;
  startTime: string;          // ISO
  metadata: {
    client: string;
    version: string;
    character: string | null;
    type: 'user' | 'spectate'; // NEW
    spectatedCharacter?: string; // NEW — for spectate logs
  };
  log: LogEntry[];
}

type LogEntry =
  | { t: number; typ: 'rx' | 'tx' | 'gmcp' | 'ui' | 'sys'; d: string }
  | { t: number; typ: 'flag'; d: { kind: 'death_self' | 'death_enemy_player'; name?: string } }; // NEW
```

---

## Implementation Plan & Progress

### Phase 1 — Always-On Recording
- [x] Remove manual start/stop recording UI from Header menu
- [x] Auto-start user recorder on telnet connect
- [x] Auto-save user recorder on telnet disconnect
- [x] Auto-start spectate recorder on spectate-start (hooks into useModeStore.isSpectating)
- [x] Auto-save spectate recorder on spectate-end
- [x] Add `type` and `spectatedCharacter` fields to log metadata
- [x] Consolidate duplicate SessionLog/LogEntry types — canonical source is now `src/types/session.ts`
- [ ] Add periodic IndexedDB flush (every 30s or 500 entries) for crash recovery
- [ ] Update RecorderHUD to be a passive indicator (or remove it)

### Phase 2 — Sandboxed Replay Session
- [x] Wire replay `onData` callback to sandboxed `replayMsg` store (live state never touched)
- [x] GMCP skipped during replay — no live state mutation
- [x] `replayMessages: Message[]` exposed via `LogContextType` / `useLog()`
- [x] `sessionMode` driven from `replayer.log` via `useEffect` in GameContext (set to `'replay'` on load, `'live'` on clear)
- [x] `MessageLog` uses `sessionMode === 'replay'` to switch display to pre-computed replay messages (time-filtered by `currentTime` — handles seeking correctly)
- [x] Live log hidden while replay is active (different message store shown)
- [x] `LibraryModal` export inlined (removed dependency on removed `saveLog`)

### Phase 3 — Theater Mode Trigger Fix
- [x] Removed "Live Attach Logic" useEffect from MessageLog (was calling `attachToLive` → `setIsVisible(true)` on scroll-up)
- [x] Removed Timeline Scrubber overlay from MessageLog (appeared on scroll-up)
- [x] Removed `setIsVisible(true)` from `attachToLive` in `useSessionReplayer.ts`
- [x] Theater mode now ONLY activates from Library (`loadLog` → `setIsVisible(true)`) or "Show Replay Controls" menu item when log already loaded

### Phase 4 — Death Flagging
- [x] `'flag'` entry type already in `LogEntry` union (`src/types/session.ts`)
- [x] `recordEntry` in `useSessionRecorder.ts` scans `rx` data for death patterns and pushes `FlagEntry` immediately after the `rx` entry
- [x] `death_self` — detects `"You are dead!"` in decoded rx text
- [x] `death_enemy_player` — detects `*Name* has drawn his last breath! R.I.P.` regex
- [x] Retroactive rescan in `loadLog()` — injects flag entries for older logs without modifying originals

### Phase 5 — Timeline Markers in ReplayHUD
- [x] `flagMarkers` useMemo parses `typ: 'flag'` entries from `replayer.log` in ReplayHUD
- [x] Red dot = `death_self`, Gold dot = `death_enemy_player` on scrubber
- [x] Clicking a dot seeks to that timestamp; tooltip shows who died
- [x] Prev/next death navigation (☠ counter) in the search row

### Phase 6 — Spectate Live Buffer
- [ ] Create `useSpectateBuffer` hook (in-memory rolling log, `bufferMs` param)
- [ ] Wire snoop feed as dual input: → spectate recorder (live) + → buffer (delayed read)
- [ ] Build `LiveBufferHUD` component: buffer size selector, lag indicator, "jump to live"
- [ ] Show `LiveBufferHUD` during active spectate (separate from ReplayHUD)

---

## Key Files

| File | Role |
|---|---|
| `src/hooks/useSessionRecorder.ts` | Recording engine — entries, persistence, flush |
| `src/hooks/useSessionReplayer.ts` | Playback engine — seek, speed, live attach |
| `src/context/GameContext.tsx` | Session wiring, replay `onData` injection (lines 210–267) |
| `src/context/GameContext/useSessionState.ts` | Parallel session contexts |
| `src/context/GameContext/types.ts` | `SessionSlot`, `SessionLog`, `LogEntry` types |
| `src/components/Layout/HUD/ReplayHUD.tsx` | Playback controls, scrubber, markers |
| `src/components/Layout/HUD/RecorderHUD.tsx` | Recording indicator |
| `src/components/Messages/MessageLog.tsx` | Must switch store based on active session |
| `src/components/Modals/LibraryModal.tsx` | Session library — load, delete, tag |
| `src/hooks/useSessionReplayer.ts` | `attachToLive()` — base for spectate buffer |

---

## Decisions Log

- Always-on recording: no opt-in, no minimum duration, user deletes via Library
- Replay is sandboxed: own session slot, own message store, live state never touched
- Theater mode: Library-only trigger, scroll no longer activates it
- Spectate buffer: ephemeral, independent of recorder, separate HUD
- Death flags: only `death_self` and `death_enemy_player` — no NPC deaths
- Retroactive flag scan on `loadLog()` for backwards compatibility
- Spectate recording: writes at live time regardless of buffer offset
- Log separation: user logs never contain snooped data, spectate logs never contain user tx
