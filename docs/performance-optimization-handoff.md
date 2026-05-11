# MUME Client Performance Optimization Handoff

## Goal

Investigate and improve perceived client sluggishness, especially delayed command sends and delayed rendering of received game text.

The client is close feature-wise, so prioritize low-risk responsiveness work over broad rewrites. Measure before and after each meaningful change.

## Working Theory

The sluggishness may not be pure network latency. Browser WebSocket callbacks, React rendering, canvas drawing, tokenization, scrolling, logging, and input handling all share the main thread. If that thread is busy, commands can be delayed before they leave the client, and received data can wait before parsing or rendering.

Treat the problem as three separate latency buckets:

1. UI command path delay: user action to telnet send.
2. Network/server delay: telnet send to socket receive.
3. Client receive/render delay: socket receive to visible log output.

## First Task: Add Lightweight Latency Instrumentation

Add a small debug-only timing probe. It should be easy to remove or keep gated behind an existing debug setting such as `showDebugEchoes`.

Track these timestamps:

- `command:start`: beginning of `executeCommand`.
- `command:sent`: immediately before or after `sendBytes`.
- `socket:rx`: top of the WebSocket receive handler.
- `parser:start` and `parser:end`: around chunk/token processing.
- `log:queued`: when `addMessage` buffers a message.
- `log:flushed`: when `flushMessages` commits to React state.
- `log:paint-ish`: optional, after a `requestAnimationFrame` following flush.

Suggested files to inspect:

- `src/hooks/useCommandController.ts`
- `src/hooks/useCommandExecutor.ts`
- `src/hooks/useTelnet.ts`
- `src/hooks/useMessageLog.ts`
- `src/components/Messages/MessageLog.tsx`

The output should summarize deltas, not spam every line. A rolling average and worst spike per bucket is enough.

## High-Priority Optimization Candidates

### 1. Send Telnet Bytes Earlier

Current command flow does several things before sending the command:

- Initializes audio.
- Runs command middleware.
- Adds user echo to the log.
- Runs mapper prediction for movement.
- Dispatches mapper events.
- Sends telnet command near the end.

File:

- `src/hooks/useCommandExecutor.ts`

If safe, move the actual telnet send earlier after command normalization/middleware, then do nonessential UI work afterward. Be careful with middleware that cancels, expands, or rewrites commands.

Acceptance criteria:

- Normal commands still echo correctly.
- Silent/system commands remain silent.
- Semicolon commands, target commands, capture commands, and mapper movement commands still behave correctly.
- `command:start -> command:sent` is consistently tiny.

### 2. Stop Idle Mapper Rendering

The mapper animation loop currently stays alive whenever a player position exists:

- `src/components/Mapper/useMapAnimation.ts`

This line is suspicious:

```ts
if (playerPosRef.current) needsNextFrame = true;
```

That can keep canvas rendering active at roughly 60fps even when idle. Convert this to dirty/animated rendering:

- Keep rendering during drag, movement, trails, exploration fade, marquee, walk target, or explicit render version changes.
- Do not render forever just for an idle player marker.
- If the player marker pulse is desired, make it optional or much lower frequency.

Acceptance criteria:

- CPU/GPU use drops when standing still.
- Map still updates immediately on movement, drag, zoom, room changes, and selection.
- No stale canvas after toggling map settings.

### 3. Reduce Log Render Fan-Out

`TokenRenderer` currently consumes broad global state in every visible message/token tree:

- `src/components/Messages/TokenRenderer.tsx`

It calls:

- `useVitals()`
- `useSettingsStore()` with no selector
- `useBaseGame()`

This can cause visible log rows to rerender for unrelated state changes.

Refactor toward narrow props or selectors:

- Pass current target from `MessageLog`.
- Pass only needed colors.
- Pass `inlineCategories` directly.
- Avoid subscribing each token renderer to the entire settings store or full game context.

Acceptance criteria:

- Target highlighting and inline button colors still work.
- Changing unrelated settings does not rerender all visible log rows.
- Combat, comms, room names, and object/player/NPC tokens still render correctly.

### 4. Cache Occupant Tokenization Work

`Tokenizer.tokenizeKnownOccupants` rebuilds candidate lists and a large regex per text chunk:

- `src/services/parser/Tokenizer.ts`

Cache occupant patterns by a stable key derived from occupant IDs, names, shorts, keywords, and types. Invalidate when Room.Chars/occupants change.

Acceptance criteria:

- Inline occupant buttons still resolve correctly.
- Duplicate occupants still get numbered command targets correctly.
- Busy-room and combat text processing gets faster in instrumentation.

### 5. Review Receive-Side Batching

Inbound text currently goes through:

- `setTimeout(..., 0)` in `src/hooks/useTelnet.ts`
- A 50ms visual log batch in `src/hooks/useMessageLog.ts`

The batching helps avoid React thrash, but it also adds perceived latency. Consider:

- Flushing prompts, user echoes, comms, combat, and urgent lines sooner.
- Keeping bulk room descriptions batched.
- Using `requestAnimationFrame` or a shorter adaptive delay instead of a fixed 50ms timeout.

Acceptance criteria:

- Rapid spam does not tank FPS.
- Single command responses feel immediate.
- Scroll lock remains stable at the bottom.

### 6. Gate Hot-Path Console Logging

There are many unconditional `console.log` calls in GMCP handlers, mapper interactions, joystick handlers, parser/capture handlers, and layout code.

Examples to inspect:

- `src/hooks/useGmcpHandlers/*`
- `src/hooks/useJoystick.ts`
- `src/components/Mapper/useMapperInteractions.ts`
- `src/components/Mapper/useMapAnimation.ts`
- `src/hooks/GameParser/useCaptureParser.ts`
- `src/hooks/useViewport.ts`
- `src/hooks/useTelnet.ts`

Move noisy logs behind a debug flag or remove them. Avoid logging full JSON payloads in streaming paths unless explicitly debugging.

Acceptance criteria:

- Production/dev normal play does not continuously print parser/GMCP/movement logs.
- Debug logging can still be enabled intentionally.

## Structural Follow-Up

The provider layer subscribes to entire Zustand stores and builds large context objects:

- `src/context/GameContext.tsx`
- `src/context/GameContext/state.ts`

Use narrow selectors where practical. Avoid putting fast-changing state into broad context values consumed by many components.

This can be done after the more targeted fixes above.

## Validation Plan

Run these checks after changes:

```bash
npm run typecheck
npm run build
npm run test:unit
```

Also do manual verification:

- Connect and send simple commands like `look`, movement, `score`, `info`, `who`.
- Test a busy-room or simulated spam scenario.
- Confirm command echo appears promptly.
- Confirm received text appears promptly.
- Confirm mapper still updates while moving and idles quietly when standing still.
- Confirm mobile input focus behavior is not regressed.

## Documentation Requirements

Document any major behavior or architecture changes:

- Update `ARCHITECTURE.md` if performance architecture or state ownership standards change.
- Update `AGENTS.md` if strategic file guidance changes.
- Add comments only where they explain non-obvious performance tradeoffs.

Keep implementation files under the project 300-line mandate where feasible. If a fix touches an already-large file, prefer extracting focused helpers rather than expanding it further.

