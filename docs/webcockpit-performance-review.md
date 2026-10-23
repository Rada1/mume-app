<!-- @file webcockpit-performance-review.md — Source comparison of interactive latency. -->

# WebCockpit performance comparison

Reviewed 2026-10-23 against Khazdul/webcockpit revision
`9a82040c380f2cb1e416ab1633e761a7bc02e1a2` (2026-10-22).
This is a source audit. No comparative runtime benchmark was performed and no
application behavior was changed as part of the review.

## Finding

Both clients default to `wss://mume.org/ws-play/`. Both send synchronously once
their command handling reaches the socket. The clearest opportunities are in
client processing, scheduling, rendering and connection diagnostics; there is
no evidence here of a faster network route in WebCockpit.

WebCockpit is a useful reference because it has scripting, recording, panes
and a mapper alongside a deliberately small text and input path. Its UI chrome
uses Preact; live output uses a plain TypeScript DOM renderer.

## Differences and implications

### 1. Display latency is measured explicitly

WebCockpit timestamps inbound lines, measures key-to-send, receive-to-shown,
socket buffered bytes, frame script work, input delay and long frames. Samples
live in bounded rings. Percentiles and worst events are calculated on demand.

Our `src/utils/perfMonitor.ts` covers map frames, rebuilds, saves, long tasks
and tokenizer execution. Worker timing excludes message transfer, worker
startup and queue waiting; normal direct tokenization in
`PipelineOrchestrator.ingestChunk` is not covered by the fallback timing.
We cannot currently separate network delay from the full text display delay.

**Priority:** instrument the full path before choosing a larger renderer change.

### 2. Less representation and DOM work per line

WebCockpit stores text plus style ranges, creates text nodes for unstyled
content and spans for styled ranges, and appends fragments to scrollback
chunks. It does not reconcile the output through Preact.

Our `useGameParser.ts` converts lines to ANSI HTML and calls
`PipelineOrchestrator.processTextLine`, which also constructs token-derived
HTML. `MessageLog.tsx` normally renders tokenized lines with `TokenRenderer`.
The normal text/ANSI branches in `TokenRenderer.tsx` often split content into
word spans. Some paths already collapse text, including Classic mode and
target-matching branches, so element counts must be compared per mode.

**Priority:** make fallback HTML lazy and collapse ordinary text into runs.
Keep entity boundaries, command targets, ANSI semantics and interactions.
This can be done inside our current React architecture.

### 3. Partial text has a visible path

WebCockpit's assembler emits `text.partial` for an unfinished tail after
receiving text, and its output pane updates a dedicated partial row.

Our `useTelnet.ts` retains uncompleted trailing text in `bufferRef` unless
it recognizes a prompt or login question. Output split across packets can
therefore wait for a later delimiter even though bytes have already arrived.

**Priority:** evaluate a separate display-only partial tail. Commit complete
lines to the parser once, preserving captures, pager behavior and prompt
boundaries. Do not run gameplay effects repeatedly on partial text.

### 4. Work is bounded before the next input event

WebCockpit caps output construction at 500 rows per frame, discards queued
display rows that cannot survive its scrollback limit, and trims whole chunks.
Its ingest and recorder optimizations avoid repeated allocation and large
storage tasks. This does not mean it discards game parsing or recording.

Our log batches commits by animation frame and virtualizes visible rows,
which are useful existing protections. Our receive pipeline directly handles
the first eight lines of a large chunk, then awaits worker slices of sixteen.
`tokenizationChainRef` serializes later chunks behind the entire preceding
chunk. The full gameplay parser still runs on the main thread. This ordering
is necessary for captures; queue delay and time spent in the full parser
need measurement before the schedule is changed.

**Priority:** measure queue age, lines pending and per-turn processing time.
Preserve exact stream order and bound optional enrichment work. Do not jump
later prompts ahead of earlier text or discard authoritative game events.

### 5. Sending precedes optional UI effects

WebCockpit resolves scripts, then sends before input cleanup and scrolling.
Our low-level socket already sends directly. Above it, `handleSend` updates
history and clears input first; `useCommandController.ts` has UI/capture/focus
handling, and `useCommandExecutor.ts` initializes audio and runs middleware
before writing. Echo and several other effects already occur after the write.

**Priority:** keep required command rewriting and capture registration before
the send, and move optional audio, focus, cleanup and visual work after it.
Measure event waiting time as well as handler execution: a blocked main thread
delays the key handler before any send-first optimization can help.

### 6. Connection health is explicit

WebCockpit sends tracked Core.Ping requests, detects unanswered requests and
checks application liveness on phone resume. It exposes socket buffered bytes.
It distinguishes a network-link probe from a game response, documenting that
the latter includes server pulse waiting.

Our hook sends periodic Core.KeepAlive and reconnects following a closed
WebSocket. Returning to the foreground reconnects only when the socket
reference is absent. A stale connection still marked OPEN has no comparable
application-level resume check in these hooks.

**Priority:** add negotiated liveness checking and useful diagnostics. Treat
ping, network estimates and command-response time as separate measurements.
Never resend gameplay commands automatically after an uncertain disconnect.

### 7. Animations and scroll work deserve isolated comparisons

WebCockpit's performance review found continuously animated elements changed
frame scheduling in its test browsers. It uses a timer for caret blinking and
patches side panes only when their content changes. Its results are specific
to the documented browsers, hardware and workloads.

Our immersion mode deliberately animates weather and other scenery.
`MessageLog.tsx` also has several paths that correct scroll position, including
post-update animation frames and resize observers. Their actual contribution
to perceived text lag requires tracing. Do not remove immersion features based
only on another application's measurements.

## Recommended sequence

1. Add bounded latency diagnostics: event-to-send, receive-to-display,
   parser queue age, full parser cost, render/scroll cost and socket backlog.
2. Remove duplicate HTML work, reduce ordinary word spans, and send before
   optional UI effects. Preserve the existing interactive entity model.
3. Add partial-tail display and optimize scheduling using the new measurements.
4. Harden phone resume and stale-link detection.
5. Prototype an imperative output surface only if the remaining React/render
   cost justifies it. Keep our current virtualization until an alternative
   demonstrates better latency, selection, scroll stability and interactions.

Compare identical production workloads on the same device and browser:
quiet play, combat with group/chat/map active, a large help or inventory reply,
typing during a burst, full scrollback, a long session, and background/resume.
Record median, p95, p99 and worst-case timings; a local replay isolates client
cost while a live session includes the server and network.

## Sources

All WebCockpit links below are pinned to the reviewed revision.

- [Transport and endpoint](https://github.com/Khazdul/webcockpit/blob/9a82040c380f2cb1e416ab1633e761a7bc02e1a2/src/net/ws-transport.ts)
- [Session and synchronous sending](https://github.com/Khazdul/webcockpit/blob/9a82040c380f2cb1e416ab1633e761a7bc02e1a2/src/net/session.ts)
- [Input submission](https://github.com/Khazdul/webcockpit/blob/9a82040c380f2cb1e416ab1633e761a7bc02e1a2/src/ui/input-pane.ts)
- [Output construction and partial row](https://github.com/Khazdul/webcockpit/blob/9a82040c380f2cb1e416ab1633e761a7bc02e1a2/src/ui/output-pane.ts)
- [Line assembly and partial text](https://github.com/Khazdul/webcockpit/blob/9a82040c380f2cb1e416ab1633e761a7bc02e1a2/src/text/assembler.ts)
- [Latency monitor design](https://github.com/Khazdul/webcockpit/blob/9a82040c380f2cb1e416ab1633e761a7bc02e1a2/docs/decisions/0047-perf-latency-monitor.md)
- [Performance review decisions](https://github.com/Khazdul/webcockpit/blob/9a82040c380f2cb1e416ab1633e761a7bc02e1a2/docs/decisions/0044-performance-review-outcome.md)
- [Ingest optimizations](https://github.com/Khazdul/webcockpit/blob/9a82040c380f2cb1e416ab1633e761a7bc02e1a2/docs/decisions/0048-ingest-performance-fixes.md)
- [Connection liveness](https://github.com/Khazdul/webcockpit/blob/9a82040c380f2cb1e416ab1633e761a7bc02e1a2/src/net/keepalive.ts)
- [Network link versus game response](https://github.com/Khazdul/webcockpit/blob/9a82040c380f2cb1e416ab1633e761a7bc02e1a2/docs/decisions/0030-link-readout-http-probe.md)
- [Published benchmark results and limitations](https://github.com/Khazdul/webcockpit/blob/9a82040c380f2cb1e416ab1633e761a7bc02e1a2/bench/results/latest.md)


## Implementation pass: mobile command responsiveness

The first implementation pass removes unrelated log-scroll positioning work,
reuses unchanged popup positions, preserves branch transforms when unchanged,
and stops resetting menu scroll on eligibility refresh. Target/controller
appearance subscriptions are narrowed. Command rows use mouse-only hover
previews. Text/ANSI runs no longer require word spans when their effects are
inactive. Input cleanup and audio initialization follow command dispatch.

PERF now exposes parser queue wait and full chunk processing p95/max,
command-dispatch-to-socket p95, and socket backlog. Processing includes worker
waits; these numbers must not be presented as receive-to-paint or network RTT.
A positioning regression test guards against log scrolling causing dock
measurements. Physical-phone latency comparisons remain necessary before
claiming a measured speedup or replacing the output architecture.
