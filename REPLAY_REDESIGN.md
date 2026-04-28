# Replay & Recording System Redesign

## Status: IN PROGRESS — Phase 2 in progress

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
- [ ] Add `'replay'` as a valid `SessionSlot` in types
- [ ] Create replay session context (parallel to user/spectate in `useSessionState`)
- [ ] Wire replay `onData` callback to inject into replay session context only
- [ ] Update `MessageLog` to read from the active session's message store
- [ ] Ensure live session state is never mutated during replay
- [ ] Switch `activeSession` to `'replay'` on library open, restore on dismiss

### Phase 3 — Theater Mode Trigger Fix
- [ ] Remove scroll-up trigger for theater mode / ReplayHUD visibility
- [ ] Theater mode only activates via Library selection
- [ ] Audit all places that set `replayer.state.isVisible = true` and restrict to library path

### Phase 4 — Death Flagging
- [ ] Add `'flag'` entry type to `LogEntry` union in types
- [ ] In recording pipeline, scan each incoming `rx` line for death patterns
- [ ] Emit `death_self` flag when line contains `"You are dead!"`
- [ ] Emit `death_enemy_player` flag when line matches `*Name* has drawn his last breath! R.I.P.`
- [ ] Add retroactive rescan in `loadLog()` for logs recorded before this feature

### Phase 5 — Timeline Markers in ReplayHUD
- [ ] Parse flag entries out of loaded log on `loadLog()`
- [ ] Render colored marker dots on the scrubber at flag timestamps
- [ ] Red dot = `death_self`, Gold dot = `death_enemy_player`
- [ ] Clicking a marker seeks to that timestamp
- [ ] Add prev/next death jump buttons to ReplayHUD

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
