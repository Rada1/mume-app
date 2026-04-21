# DVR Buffer Replay System - Technical Plan

This document outlines the migration from the fragile `SessionReplayer` to a robust "Event Sourcing" DVR architecture.

## Core Concept
Instead of hijacking the live state, the client maintains a continuous **Event Buffer**. Every GMCP packet and text line is a timestamped event. To view the past, the UI "projects" the state by running the event buffer through the standard parsers into a separate set of "Replay Stores."

## Component Architecture

### 1. The Recorder & Keyframer (`src/services/replay/ReplayRecorder.ts`)
- **Responsibility:** Background logging.
- **Mechanism:** Subscribes to `gmcpBus` and the `MessageLog`.
- **Storage:** Appends to a `GlobalEventBuffer` (memory-resident for the session).
- **Keyframes:** Every 5 minutes or 1,000 events, it takes a snapshot of all Zustand stores (`Vitals`, `Room`, `Combat`) and stores it as a `Keyframe { index, snapshot }`.

### 2. The Replay Stores (`src/stores/replay/`)
- **Responsibility:** Isolated state sandbox.
- **Files:** `useReplayVitalsStore.ts`, `useReplayRoomStore.ts`, `useReplayCombatStore.ts`.
- **Requirement:** Must match the exact interface of the main stores but include a `loadSnapshot(data)` action to instantly overwrite state.

### 3. The Playback Engine (`src/hooks/useReplayEngine.ts`)
- **Responsibility:** The "VCR" logic.
- **Functions:** 
  - `seek(timestamp)`: Finds the nearest preceding Keyframe, loads it, and rapidly applies subsequent events from the buffer.
  - `play()` / `pause()`: Ticks the `currentEventIndex` based on real-time deltas.
  - `playbackSpeed`: 1x, 2x, 4x support.

### 4. The Switchboard (`src/stores/useActiveGameState.ts`)
- **Responsibility:** UI routing.
- **Logic:** Update `useActiveVitals`, `useActiveRoom`, etc., to return the `ReplayStore` slice when `useModeStore.mode === 'replay'`.

### 5. The Replay HUD (`src/components/HUD/ReplayHUD.tsx`)
- **Responsibility:** User controls.
- **Features:** Scrubber bar, "Live" snap-back button, and playback controls.

---

## Parallel Tasking Plan

- **Task 1 (Agent A):** Build the `ReplayRecorder.ts` and `GlobalEventBuffer`.
- **Task 2 (Agent B):** Build the `src/stores/replay/` set of stores.
- **Task 3 (Agent C):** Build the `useReplayEngine.ts` (Headless playback logic).
- **Task 4 (Agent D):** Integration & Switchboard (Run after T1-T3 land).
- **Task 5 (Agent E):** UI & Scrubber (Run after T4 lands).
