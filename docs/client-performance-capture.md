# Client performance capture

Enter `/perf` in the command input on desktop or mobile. Reload after diagnostics
changes, open the overlay, press **reset**, then reproduce the slow interaction.
Capture the overlay immediately afterward. It scrolls if it exceeds the screen.

For a perceived delay before the first reply, send **one command at a time** in a
quiet room after initial loading and snapshot requests finish. Read the top
**last press → send**, **last send → first text**, **last text → log commit**, and
**last press → log commit** rows. These are the latest completed isolated sample,
not p95 statistics. Overlapping command replies are excluded until their prompt
boundaries clear; silent commands participate in ordering but are not samples.
An em dash means no sample/input timing is available.

**input → send last/max (incl bursts)** records client dispatch timing independently
of replies. Reset before reproducing a slow first command followed by rapid taps:
the maximum retains the first delay even when later sends are fast and replies
overlap. It starts at the pointer-down/Enter event timestamp and ends immediately
before the transport send call; it includes a held press and browser event-queue
delay, but does not measure delivery to the server. Silent sends and sends without
a fresh input are excluded. Reply timing still requires isolated commands.

Send-to-text includes the server, bridge/network, and delay before the browser
delivers its text callback; it is not a pure network RTT. The first delivered text
and matching next log output are proxies for a command reply: unrelated live room
text can interfere, hence the quiet-room requirement. Log commit measures the
first tracked nonempty reply row mounting, before browser painting. Physical
display latency is not measured. Only timestamps and an internal message ID are
retained, never command contents or credentials.

React **Client**, **Log**, and **Commands** rows show render p95 and maximum
duration for the last 120 commits observed while collection is enabled. Client
includes the nested boundaries: do not add their times together. These measure
React rendering, not commit effects, browser layout, painting, or network latency.
React timings require a development or profiling build; ordinary production
React does not provide these samples.

Command-panel drill-down includes **Menu branches**, **Captured output**, and
**Character summary** React boundaries. **JS** rows separately time synchronous
controller, target-context, chat, shop, practice, action-catalog, and target-tree
hook work. These rows measure render attempts (including repeated development
renders), excluding descendant rendering and later effects. Controller includes
its individual model phases, so do not sum them. Inspect the highest JS or nested
React row to locate work hidden by the overall Commands boundary.

The command tree caches normalization, duplicate merging, group assignment, and
section ordering separately from target eligibility. Room target updates must
refresh eligibility without rebuilding that catalog. Regression coverage lives
in `src/hooks/useCommandTree.performance.test.tsx`.

Group eligibility and per-target trait sets are lazy within each target snapshot.
The root strip reads group labels only; do not materialize every group's buttons
while rendering it. Only the viewed group or explicitly requested command needs
its targets checked. The **Tree catalog** and **Tree eligibility** JS rows separate
these costs within the overall **Target tree** measurement.

Trait name checks reuse bounded compiled keyword matchers in
`inlineKeywordMatching.ts` and default name matches in `inlineActionModel.ts`.
Only static default classification is cached by name; saved custom overrides and
exclusions are applied on each resolution. Pointer-generated focus and touch
compatibility mouse events must not publish hover previews before execution.
Movement-pad touch leave must not update the shared command preview. Regression
coverage includes `inlineKeywordMatching.test.ts`, `inlineActionModel.test.ts`,
`MovementPad.test.tsx`, and `CommandTreeCommandList.mobile.test.tsx`.

Browsers with the Long Animation Frames API also report the last 60 slow frames:

- **slow browser frames/max**: retained frame count and longest frame duration.
- **frame script work max**: largest sum of attributed script durations in a frame.
- **style/layout/render tail max**: time from the browser's style/layout start
  timestamp to the end of the frame. This includes subsequent rendering work;
  it is not an isolated layout or GPU measurement.
- **forced layout in scripts max**: largest sum of synchronous style/layout time
  attributed to scripts in one frame. This is already included in script time.
- **slow script**: function or invoker name of the longest attributed script.

These maxima can belong to different frames. Script attribution is subject to
browser coverage and security restrictions; an absent script name does not rule
out JavaScript work. Unsupported browsers show **unavailable**, rather than zero.
No source URLs, message text, or DOM nodes are retained by this collector.

Long socket handlers can block input as well as replies. Binary GMCP must route
only through `GmcpDecoder`: the removed secondary dispatcher previously invoked
normal vitals callbacks four times per packet and room-info callbacks three times.
The vitals scalar updater must not call the package callback again. Regression
coverage in `useTelnet.gmcp.test.tsx` checks single dispatch, repeated identical
packets, aliases, fragmented packets and GMCP-before-text ordering. Callback count
reductions do not imply the same proportional reduction in total frame duration.

Text processing measures wall-clock batch duration, including worker waits and
cooperative yields. Compare it with tokenization and line-handler timings before
attributing a slow batch to parser CPU cost. Text queue wait starts after the
socket text callback, so it does not measure networking or delivery delays before
that callback can run.

Worker map FPS and intervals measure on-demand redraw activity. Idle gaps are
not evidence of a frozen map; inspect actual worker render durations instead.

**Terminal layout** times the coalesced sizing handler in `useTerminalLayout.ts`.
Resize notifications schedule one animation-frame update. Geometry/padding checks
skip unchanged work; the DOM font-width probe is cached until layout options or
loaded fonts change. Preserve font-load invalidation and cleanup of pending work.

Reset clears the UI, parser, dispatch, and main-thread diagnostic samples. The
worker map counters have their own collection window. Toggle `/perf` off to stop
collecting. Profiling boundaries remain mounted, preserving menu and log state.
