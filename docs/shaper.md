# Shaper Collaborative Builder Workspace

## Purpose

Shaper Mode is a real-time collaborative GUI editor for MUME building. It is
not a play mapper. It is a shared concept-building studio where builders plan,
review, validate, and eventually deploy zone changes together.

The workspace turns the building guide workflow into structured UI:

- zone info, story notes, and asciimap planning
- 10x10 zone room layout
- room names, prepositions, descriptions, sectors, flags, keywords, and exit descriptions
- exits, one-way exits, doors, and climbs
- reset `/com` command trees
- mobile and object drafts
- room/object/mobile libs
- shops and shop policies
- comments, review state, validation, command preview, and deploy logs

The default workspace shows the **concept area**, not the live/play map. Live
state is a baseline/reference used for imports, comparison, drift detection, and
deployment verification.

## Product Principles

### Collaborative First

Real-time collaboration is a core requirement, not a later retrofit. Every
builder should see edits, selections, comments, and activity as they happen.

The first real milestone should support a shared draft document with:

- live room and exit editing
- collaborator presence
- comments attached to exact artifacts
- validation warnings
- deep links that are useful during Discord discussion

### Concept Before Production

Builders work in a concept draft. No concept change becomes real until it is
validated, previewed as commands, approved by a human deployer, sent through a
single deploy queue, and verified.

Recommended concept statuses:

- `New Draft`
- `Imported Draft`
- `Modified`
- `Marked for Removal`
- `Pending Deploy`
- `Deployed`
- `Verified`
- `Failed`
- `Out of Sync`

### Irregular Zones and Vertical Space

The visible 10x10 grid is the base zone plane, not the whole data model.
Irregular areas should remain organized through:

- layer controls for `Surface`, `Above`, and `Below` rooms so towers, caves,
  and tunnels stay separated by z-level
- extra room lists attached to each layer for rooms that do not fit cleanly
  into the 10x10 coordinate plane
- anchor links from extra rooms back to parent grid rooms so branch tunnels and
  overflow rooms remain traceable
- sector-colored room tiles using terrain-like backgrounds so forest, road,
  water, city, indoor, hill, and mountain choices are readable at a glance

### GUI Over Raw Syntax

The GUI should hide command syntax during editing while still making generated
commands transparent before deployment. Builders edit structured fields and
trees; the app compiles them into `/room`, `/com`, `/mob`, `/obj`, `/lib`,
`/shop`, and `/info` commands.

### Discord Friendly

Discord remains the conversation hub. Shaper provides the shared working
surface.

Required Discord-friendly behavior:

- shareable links to a workspace, zone, room, exit, command node, or validation issue
- follow mode for watching another builder's selection/camera
- compact review view for people in voice chat
- activity summaries that can be posted by a future Discord bot
- roles that can be mapped from Discord later

### Privileged Builder Surface

Shaper Mode should be distinct from the base game client. Ordinary players
should not see the Shaper entry point, route, shortcuts, deploy controls, or
builder-only command previews.

Access should be gated before the workspace loads. The base client may contain
the code for Shaper, but collaboration sessions and builder projects should
only activate for users with explicit builder permissions.

Recommended access layers:

- feature flag: hides Shaper globally unless enabled for the deployment
- passcode or invite code: lets builders unlock Shaper without local setup
- authenticated identity: Discord OAuth or app session identity
- role check: builder/reviewer/deployer/admin permission
- workspace membership: user must be invited or assigned to the specific zone/workspace
- server-side enforcement: collaboration and deploy services reject unauthorized users

The UI should fail closed. If access cannot be verified, allow only the
passcode prompt and do not connect to the collaboration service. The current
foundation build uses a client-side passcode for convenience; production
collaboration must validate passcodes server-side.

## Architecture

```text
React Shaper UI
    |
    v
Headless Shaper Operations
    |
    v
Shared Concept Document
    |
    +--> Yjs/CRDT collaboration adapter
    +--> Validation engine
    +--> Command serializer
    +--> Deploy queue
    +--> MCP/AI adapter
```

Implementation should be feature-based and should not expand `MapperContext`.
Components stay thin; business logic belongs in Shaper domain modules, hooks,
and services.

Suggested module layout:

```text
src/shaper/
  model/
    shaperTypes.ts
    shaperDocument.ts
    shaperOperations.ts
    shaperValidation.ts
    shaperCommandSerializer.ts
  collaboration/
    shaperSyncAdapter.ts
    shaperPresence.ts
    shaperRoles.ts
  deployment/
    shaperDeployQueue.ts
    shaperDeployTypes.ts
  hooks/
    useShaperWorkspace.ts
    useShaperSelection.ts
    useShaperValidation.ts
    useShaperDeployQueue.ts
  components/
    ShaperWorkspace.tsx
    ShaperCanvas.tsx
    ShaperInspector.tsx
    ShaperLeftPanel.tsx
    ShaperBottomPanel.tsx
```

Every new source file must follow the project rules:

- `@file` header
- explicit logic section separators
- no `any`
- source files under 300 lines
- shared interfaces in typed Shaper model files or `src/types`

## Collaboration Model

Use an app-owned WebSocket service for v1 collaboration. The service should own:

- workspace sessions
- persisted shared documents
- Yjs update relay
- awareness/presence relay
- user identity and roles
- deploy locks
- audit events
- project membership and invite/passcode redemption

Client state should derive from the shared concept document. React component
state may hold transient UI details such as panel open state, local hover, and
viewport camera, but durable builder data must live in the shared document.

### Presence

Presence should show:

- who is online
- selected rooms/exits/nodes
- active inspector field
- typing/editing status
- follow target
- recent activity

Presence must not rely on color alone. Use names, outlines, icons, and an
activity feed.

### Roles

Initial roles:

- `Viewer`: inspect and comment
- `Builder`: edit concept data
- `Reviewer`: approve review states
- `Deployer`: acquire deploy lock and send commands
- `Admin`: manage workspace settings and roles
- `AI Assistant`: propose edits but cannot deploy

Roles are Shaper-specific privileges. They should not be inferred from ordinary
client access. A normal player session has no Shaper role.

## Concept Document

The concept document is the source of truth for a workspace.

Shaper can have many projects at the same time. Builders first land on a
project dashboard, then open a specific project. Each project owns its own
concept document, comments, validation state, and eventual deploy history.

Minimum v1 model:

```text
Workspace
  id
  name
  zoneNumber
  status
  createdAt
  updatedAt

ZonePlan
  infoKeywords
  storyNotes
  asciimap
  rooms
  exits
  commandNodes
  libraries
  comments
  validationIssues

RoomDraft
  id
  zoneNumber
  x
  y
  roomNumber
  status
  baselineRoomId?
  name
  preposition
  description
  sector
  flags
  owner
  keywords
  keywordDescriptions
  exitDescriptions
  notes

ExitDraft
  id
  fromRoomId
  direction
  toRoomId?
  directed one-way edge
  door?
  climb?
  status

CommandTree
  roomId
  nodes

CommandNode
  id
  roomId
  parentId?
  type
  limits
  chance
  fields
  status

LibraryInstall
  id
  targetType
  targetId
  name
  parameters
  requiresSupervisorReview
  requiresLoad
  notes
```

### Room Command Coverage

`docs/room_help.md` is the room-editor command contract. The GUI should cover
these command groups without requiring builders to type raw syntax:

- Identity: `/room name`, `/room preposition`, `/room description`
- Terrain and room rules: `/room sector`, `/room flag +|-|@`
- Topology: `/room dig`, `/room exit`, `/room noexit`, `/room copy`,
  `/room swap`
- Keywords and extra descriptions: `/room kadd`, `/room kdescription`,
  `/room kname`, `/room kkill`
- Exit descriptions: `/room edescription <dir>`
- Doors: `/room dadd`, `/room dkey`, `/room dname`, `/room dweight`,
  `/room dkill`
- Exit and door flags: `/room dset <dir> [-|+|@] <flag>...`
- Climb exits: `/room cliset`, `/room clirm`
- Administrative actions: `/room owner`, `/room build`, `/room reset`,
  `/room save`

Room editor tabs should therefore be:

- Basics: name, preposition, description, owner, status
- Terrain: official sector list, room flags, lighting helper, map visibility
- Exits: directed exits, optional create-opposite convenience, exit descriptions
- Doors: per-direction door name, key mode, key vnum, weight, door flags
- Keywords: keyword sets, synonyms, keyword descriptions
- Climb: direction, difficulty, damage, remove climb
- Commands: command preview for the selected room and deploy readiness

Important validation derived from the guide:

- `building` sector usually implies `indoors`.
- `water`, `rapids`, `underwater`, and `shallows` usually imply the `water`
  room flag.
- `stream` exit flag needs a water-related sector.
- `sunlit` without `dark` or `indoors` is probably meaningless.
- `random_exits` should warn when paired with `no_mob` interactions or mobile
  movement plans.
- `map_toggle` deserves special display because it changes concept-vs-map
  visibility for room-map output.
- Normal doors should include the `door` dset flag.
- `climb_up` and `climb_down` dset flags should not be used directly; use the
  climb editor backed by `/room cliset`.

Bidirectional travel should be represented as two independent one-way exits.
The UI may provide a convenience action to create both directions at once, but
selection, door editing, exit descriptions, climb settings, and deletion should
operate on exactly one directed exit at a time.

### Reset Command Coverage

`docs/com_help.md` is the reset-tree editor contract. The GUI needs to handle
both the visual tree and the command semantics:

- Tree editing: add, change, insert, move, copy, kill one node, kill branch,
  kill all.
- Tree placement: sibling, child, parent sibling, grandparent sibling, and
  cross-room move/copy.
- Command listing: current room, area, zone, world, `-commands`, `-changes`,
  and all-load searches for mobiles/objects.
- Diff/upgrade: zone command diff and upgrade workflows should be surfaced as
  review/deploy tools.
- Limits: parse and display `aabbccdd` as world cap, zone cap, room cap, and
  percent chance.
- Origin limits: expose `/com limit` and command-specific origin-limit rules
  where applicable.
- Parent-return behavior: child commands should visually show what parent
  result they depend on.
- Legacy need flags: support import/display, but guide users toward nested
  child commands instead.
- Execution safety: warn about nested repeats and the hard 1024-command room
  execution limit.

Command node types:

- `Mobile`
- `Follow`
- `Object`
- `Put`
- `Hide`
- `Equip`
- `Give`
- `Door`
- `Container`
- `Find`
- `Repeat`
- `Eqclass`
- `Exec`
- `Liquid`
- `Money`
- `Months`

The `/com` UI should preserve parent/child structure explicitly instead of
asking users to reason about `|--` text output.

### Library Coverage

`docs/lib_help.md` and `docs/lib_commands_reference.md` define a behavior layer
that sits beside room geometry and reset commands.

The editor needs library management for:

- Room libraries: alignment, block, coords, damage-exit, death-reason, fall,
  fishable, fog, heavy-door, hide-exits, justice, mine, mob-barrier,
  mobtrap-room, move-dropped, no-camp, no-drink-pour, no-lead-mount,
  no-ride, no-scout, no-track, partial-reset, petshop, poisonroom,
  random-movement, room-echo, room-water, sign, slope, special-door, stable,
  thorns, treasure-room, underwater-room, watch-tower, watched-room, and other
  catalog entries.
- Mobile libraries: actor, aggressive, archer, assist-mode, attack-mode,
  citizen, cityguard, converse, diurnal/nocturnal, flee behaviors, hunt,
  looter, poison, rescue-mode, scavenger, scout, sentinel, skill, stay-area,
  stay-flags, stay-sector, stay-zone, thief, walk-back, wimpy, and related
  entries.
- Object libraries: colorable, custom-identify, herb, instrument, light-desc,
  meat-object, no-shopinv, not-edible, not-hidable, poisoned-weapon,
  scalp-knife, sheath, social, surface-prefix, timed-object, and related
  entries.

Library UI requirements:

- Browse/search installed library catalogs by target type.
- Install/remove libraries on rooms, mobiles, and objects.
- Edit typed parameters when known, and preserve unknown parameters as raw
  key/value data.
- Show `/lib list`, `/lib zone list`, `/lib search`, `/lib errors`, and
  `-commands` views as import/review sources.
- Track whether a library needs `/lib ... load` or a reboot before behavior is
  active.
- Flag supervisor-review or CPU-intensive libraries before deploy.
- Relate libraries back to room/exits/reset data, for example `heavy-door`,
  `special-door`, `damage-exit`, `room-water`, `stay-sector`, `generic-key`,
  and `qtoken`.

## UI Workflow

### Main Workspace

```text
Top bar:
  workspace name, zone, collaborators, validation status, deploy lock/status

Left panel:
  zone outline, rooms, /com trees, mobs, objects, libs, shops, comments, activity

Center:
  concept 10x10 canvas

Right inspector:
  selected room, exit, command node, mob, object, lib, shop, or issue

Bottom panel:
  validation, generated commands, deploy queue, deploy log, reset/test output
```

### Room Editing

Selecting a room opens an inspector with:

- room number
- name
- preposition helper: `You are <preposition> <name>.`
- description editor with 80-character ruler
- sector selector
- flags toggles
- keyword and keyword-description editor
- exit-description editor
- comments and notes
- generated command preview for that room

Room UX should make old line-editor rules friendly:

- warn when description lines exceed 80 characters
- show room-name capitalization guidance
- warn about forced player emotion/action language
- show minimum-description guidance
- show whether changes are concept-only, modified from baseline, or verified

### Exit, Door, and Climb Editing

Canvas tools:

- drag from room edge to room edge for an exit
- choose two-way `/room dig` or one-way `/room ex`
- delete with `/room noex`
- add door metadata for `/room dadd` and `/room dset`
- add climb metadata for `/ro cliset`

Validation must warn that:

- door and climb cannot coexist on the same exit
- climb up requires skill
- climb down normally uses less skill
- doors being closed or locked at reset belongs in `/com`, not only door flags
- deathtrap exits require exit descriptions

### `/com` Tree Editing

The `/com` editor is a first-class visual tree editor.

Each node has type-specific fields and a parsed limit editor:

```text
world limit
zone limit
room limit
chance
```

The UI should show both friendly labels and generated syntax.

Example friendly tree:

```text
Mobile 1313: an orkish patrol-leader
  Follow 70: an orkish soldier
  Follow 70: an orkish soldier
  Equip 2012: wield
```

Generated preview:

```text
/com add mobile 1313 00020175
/com add 1 + follow 70 00040200
/com add 1 + follow 70 00040200
/com add 1 + equip 2012 00000050 wield
```

### Mob and Object Drafts

Mob draft editor:

- template vnum
- keywords
- short description
- long description
- look description
- flags
- lib behavior links
- info/restriction review status

Object draft editor:

- template vnum
- keywords
- type
- short description
- long description
- count mode
- wear flags
- extra flags
- affects
- values
- weight, rent, and cost
- keyword descriptions
- info/restriction review status

## Validation

Validation should run continuously and produce issue objects that can be linked,
commented on, assigned, and resolved.

Initial validation categories:

- room naming and capitalization
- room preposition missing or awkward
- room description line width over 80 characters
- possible forced action/emotion in room description
- missing room sector
- invalid or suspicious flags
- missing reciprocal exit where two-way is intended
- door/climb incompatibility
- deathtrap exit missing exit description
- invalid climb skill/damage values
- `/com` node missing required fields
- `/com` parent reference invalid
- `/com` child depends on impossible parent
- invalid `/com` limit string
- wandering mob without zone limit
- object/mobile vnum lacking info review
- command preview blocked by unresolved errors

Blocking issues prevent deployment. Warnings can be acknowledged by reviewers or
deployers, but the acknowledgement must be recorded in the audit log.

## Command Preview and Deployment

Deployment is intentionally separate from editing.

Flow:

```text
concept draft
  -> validation
  -> command serialization
  -> human preview
  -> deploy lock
  -> paced command queue
  -> response capture
  -> verification state
```

Only one deployer can hold the deploy lock for a workspace. All collaborators
can see the queue and live status.

Deploy statuses:

- `Queued`
- `Sending`
- `Sent`
- `Accepted`
- `Failed`
- `Needs Verification`
- `Verified`

Command sending should use the existing client command executor/telnet path,
not a separate socket writer. The deploy queue should throttle commands to
avoid flooding and should associate responses with command nodes when possible.

## MCP and AI

MCP should be an adapter over typed Shaper operations, not the core model.

AI may:

- create or update concept rooms
- suggest room descriptions
- apply generated room names and descriptions through typed room prose helpers
- generate missing reciprocal exits
- build `/com` tree drafts
- explain validation issues
- generate command previews
- summarize unresolved comments and TODOs

AI may not:

- mutate live game state directly
- bypass validation
- acquire deploy lock
- deploy without explicit human approval

Every AI edit must appear as a reviewable concept change and be undoable.
For file-based agent workflows, export a `.shaper.json` project, patch room prose
with `scripts/apply_shaper_room_prose.js`, then import the project back through
the dashboard. Agents should inspect context first with
`scripts/print_shaper_prose_context.js`, which includes room sectors, flags,
doors, exit descriptions, libraries, mobs, objects, notes, and neighboring room
names. In-code agents should prefer `applyShaperRoomProse()`,
`buildShaperRoomProseContext()`, and `buildShaperProjectProseContext()` over
direct JSON edits.

## Milestones

### 1. Collaborative Draft Core

- Add Shaper domain model for concept zones, rooms, exits, command trees, and comments.
- Add WebSocket/Yjs collaboration service with persistence and presence.
- Add Shaper access gating with passcode/invite flow, authenticated identity, Shaper role, and workspace membership checks.
- Add project dashboard for multiple concurrent shaping projects.
- Add Shaper workspace shell, concept canvas, room inspector, comments, activity, and collaborator indicators.
- Support deep links to workspace, room, exit, and comment.
- No live deploy yet.

### 2. Builder Semantics

- Add room validation rules from the building guide.
- Add exit, door, climb, keyword, and exit-description editors.
- Add `/com` tree editor with typed nodes and limit parsing.
- Add basic mob/object draft editors for `/com` references.

### 3. Command Preview

- Add command serializer for rooms, exits, doors, climbs, keywords, and `/com`.
- Add bottom-panel diff and command preview.
- Add validation gating so blocking errors prevent deploy approval.

### 4. Deploy Queue

- Add deploy lock in the collaboration service.
- Add paced command queue through the existing command executor.
- Capture responses and map success/failure back to command nodes and concept artifacts.
- Add audit log and `Needs Verification` states.

### 5. Discord and AI Enhancements

- Add Discord-friendly workspace links and optional bot notifications.
- Add MCP tools over Shaper operations.
- Add AI proposal flow for descriptions, validation fixes, `/com` suggestions, and command preview explanations.

## Test Plan

### Domain Tests

- create, update, and delete rooms
- connect and unlink exits
- add doors and climbs
- edit room descriptions
- build and reorder `/com` trees
- parse and format `/com` limits

### Validation Tests

- description width warnings
- missing sector
- reciprocal exit checks
- door/climb incompatibility
- deathtrap exit-description requirement
- invalid `/com` parent reference
- invalid deploy when concept points to a deleted artifact

### Collaboration Tests

- two clients edit different rooms and converge
- two clients edit the same text field without data loss
- user-specific undo does not revert another builder's change
- presence, selection, comments, and follow mode update live
- deploy lock prevents concurrent deployers

### Command Preview and Deploy Tests

- generated `/room` commands match concept room edits
- generated `/com` commands preserve parent/child structure
- deploy queue throttles commands
- failed command is marked on the correct artifact
- audit log records user, timestamp, command, and result

### UI Acceptance Scenarios

- a builder creates a new 10x10 zone concept collaboratively
- one builder edits rooms while another edits `/com`
- a reviewer follows another user's selection from a shared link
- a deployer previews commands, acquires lock, deploys, and sees per-command status
- AI proposes changes that appear as reviewable concept diffs

## Open Product Questions

- Which exact persistence backend should the collaboration service use?
- Should Shaper work offline and later reconcile, or require a live collaboration session?
- How should Discord roles map to Shaper roles?
- Who manages Shaper workspace membership and builder invitations?
- Which building commands should be included in the first deploy-capable slice?
- What response patterns from MUME can reliably mark commands accepted or failed?

## Defaults Chosen

- Plan location: `docs/shaper.md`
- First milestone: collaborative draft workspace
- Collaboration host: app-owned WebSocket service
- Collaboration engine: Yjs or equivalent CRDT adapter
- Default canvas: concept-only builder view
- Live state: baseline/reference only
- Access model: hidden from ordinary users and enforced server-side
- Deployment: human-approved, single-lock, command-preview driven
- MCP: later adapter over typed Shaper operations
