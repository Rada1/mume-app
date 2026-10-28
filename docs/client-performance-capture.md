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

**Mobile families** measures mobile family filtering for each command-tree
snapshot. Group buttons are read once and each button's section is classified
once across the twelve families. Saved bindings and Arrange updates reuse those
family command lists; live eligibility changes still rebuild them.
Family membership is cached weakly by immutable button identity across target
snapshots, reusing the prepared catalog's section cache. Each available group is
walked once; changed room eligibility still adds/removes commands immediately.
`useCommandTraitEligibility.ts` retains up to 256 category/name action sets across
room snapshots. Trait-setting, race, subrace and class changes invalidate them;
XP/gold updates do not. Per-button validity still checks the live room, terrain
and entity location; cached trait IDs must never replace those checks.

`useCommandTreeEligibility.ts` also retains the complete lazy group/target snapshot
across XP/gold/level packets. Caching only trait classification still causes the
twelve mobile families to walk every group again when the outer snapshot changes.
Race/subrace/class, trait edits, learned buttons and live target inputs invalidate
that snapshot. `useCommandTreeEligibility.test.tsx` checks both reuse and refreshes.

Target projection separates room/group/exits from personal inventory/equipment.
Room arrivals reuse the personal gear entries and their ordinal selectors. A real
inventory or equipment change rebuilds both gear lists together, retaining the
shared numbering scope. Eligibility also reuses gear candidate projections across
room snapshots and resolves Get source availability only once within each live
snapshot. `useCommandActionTargets.performance.test.tsx` and
`useCommandTreeEligibility.test.tsx` guard these cache boundaries.

Mobile menu bounds coalesce resize and visual-viewport notifications into one
animation-frame measurement. All geometry reads precede CSS writes, and identical
bounds cause no CSS writes. This avoids repeated forced layouts while the keyboard,
command input and character controls resize; it does not measure or guarantee the
total browser layout cost. `useMobileReadabilityMenuBounds.test.tsx` guards this
scheduling, write ordering and unmount cancellation.

The upstream `useButtonLogic.ts` catalog must retain its array and button identities
across target and XP/gold updates. Only race/subrace/class affect its character
requirements; target resolution belongs to execution and live action filtering.
`useButtons.ts` supplies a stable empty abilities map before skills are ready.
`useButtonLogic.performance.test.tsx` guards identity reuse and real-input refreshes.

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

Socket drill-down uses inclusive synchronous **Socket protocol**, **Socket GMCP**,
and **Socket text framing** scopes. **Mapper room matching** measures player room
resolution inside its caller. These scopes overlap: do not add them together.
They exclude queued tokenization and later React rendering. A known internal room
match skips fallback room and coordinate scans, including dark bundled-exit matches.

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

**Log follow layout** times the animation-frame scroll-height read and live-follow
write in `useLogAutoScroll.ts`. Multiple arrival/resize requests share one update;
a reader who leaves live mode before that frame must stay in history. The scroll
request returns before that update runs, even when its legacy `instant` argument
is true; following still snaps directly rather than animating.

**Log surface layout** times the log/map bounding-box reads and CSS updates in
`useLogSurfaceLayout.ts`. Scrolling inside the log, map or menus does not move
their outer surfaces and must not schedule this work. Ancestor scrolling and
resize notifications coalesce per frame, and unchanged bounds cause no CSS writes.
These scopes include any synchronous layout charged to their geometry reads;
their times overlap with the browser's forced-layout attribution.

Reset clears the UI, parser, dispatch, and main-thread diagnostic samples. The
worker map counters have their own collection window. Toggle `/perf` off to stop
collecting. Profiling boundaries remain mounted, preserving menu and log state.
