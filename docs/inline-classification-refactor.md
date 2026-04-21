# Inline Button Classification — Refactor Plan for Async Agents

This is a dispatch sheet for async coding agents (Jules). Each task below is self-contained: an agent starting cold should be able to pick one up, read only that task's section (plus the shared context), and complete it without talking to the others.

---

## Shared context (every agent reads this)

### What this app is
A mobile MUD client for MUME (a text-based online game). The client reads the game's streaming text output, applies syntax highlighting, and injects **inline buttons** (clickable `<span class="inline-btn">` elements) into the message log so players can tap words like "orc", "sword", "door" to act on them.

### What "classification" means here
When we highlight a word in a log line, we have to decide:
1. **Kind** — is this an NPC, a player, an object, an exit?
2. **Category** — if it's an object, is it a weapon, a container, a corpse, armour, etc.?
3. **Location** — if it's an object, is it in the room, in inventory, worn, or in a shop?
4. **Styling** — what color glow and class does the span get?
5. **Action set** — when tapped, which popover menu of actions (Get, Wear, Eat, Wield…) should appear?

These answers drive the span's `data-*` attributes, which later feed the click handler and the context menu (`StandardMenuPopover`).

### Key files (authoritative list)
- [src/utils/categorizationUtils.ts](../src/utils/categorizationUtils.ts) — `DEFAULT_INLINE_CATEGORIES`, `getCategoryForName`, `getCategoryType`, `getGlowColorForCategory`
- [src/utils/highlighterUtils.ts](../src/utils/highlighterUtils.ts) — `buildHighlighterCandidates` (builds the candidate list), `applyColorTaggedObjects` (handles MUME color-code 159)
- [src/hooks/useMessageHighlighter.ts](../src/hooks/useMessageHighlighter.ts) — orchestrator; `processMessageHtml` runs all passes in order
- [src/utils/buttonHierarchyUtils.ts](../src/utils/buttonHierarchyUtils.ts) — `INLINE_HIERARCHY`, `getHierarchyChain` (which menu items appear for which category)
- [src/utils/actionUtils.ts](../src/utils/actionUtils.ts) — `isButtonValidForEntity`, `getCommonActions` (filters which buttons apply to an entity)
- [src/types/ui.ts](../src/types/ui.ts) — `InlineCategoryConfig`
- [src/components/Popovers/StandardMenuPopover.tsx](../src/components/Popovers/StandardMenuPopover.tsx) — the menu that pops when a button is tapped
- [src/hooks/interactions/useButtonClicks.ts](../src/hooks/interactions/useButtonClicks.ts) — click handler, reads `data-*` attributes

### Known trickiness an agent will hit
- **Users have saved settings** that include custom `InlineCategoryConfig` arrays under `SavedSettings.inlineCategories`. Breaking the schema needs a migration path.
- **ID formats vary**: `inlinenpc`, `inline-npc`, `npc`, `inlineplayer`, `inline-player`, `player`, `pc` all exist in the codebase. Be careful which you are matching.
- **Spectate mode** injects a "snooped" player's name as a PC even when they're not in the normal room-player list — see [highlighterUtils.ts:125-129](../src/utils/highlighterUtils.ts#L125-L129).
- **Group members** (charmies / groupmates) override the normal color with a per-member palette — see [highlighterUtils.ts:216-227](../src/utils/highlighterUtils.ts#L216-L227) and `getMemberColor` in [groupUtils](../src/utils/groupUtils.ts).
- **Color-tagged objects**: MUME sends xterm-256 color 159 (`rgb(175,255,255)`) to mark objects. `applyColorTaggedObjects` re-classifies these — sometimes they're actually PCs or NPCs. See [highlighterUtils.ts:538-629](../src/utils/highlighterUtils.ts#L538-L629).
- **Corpses** are a cross-cutting concern: an NPC name in "corpse of X" context must render as an object, not an NPC. Handled in 4+ places today.
- **Accents**: MUME uses Unicode (Dúnadan, Éorenel). The highlighter uses accent-agnostic regex via `toAccentAgnostic` — don't break this.

### How to test your change
1. `npm run build` passes (no TS errors).
2. `npm run dev` starts, connect to MUME (local mock or live), and visually verify:
   - Room NPCs render as yellow buttons and open the NPC menu (with Kill/Consider/etc.)
   - Room items (color-tagged and GMCP `roomItems`) render as orange and open the object menu (Get)
   - Inventory items open the inventory menu (Drop/Wear/Wield)
   - Worn items open the worn menu (Remove)
   - PCs render as blue and group members in their group color
   - Corpses render as orange/object (not yellow NPC) — try `look` in a room after killing an NPC
   - Shopkeepers show Shop action; innkeepers show Rent
3. No regressions in special line types: `comm-sender`, `account-selection`, `account-stat-edit`, `account-character-list`, `account-menu-item`, `quest-list`, `who-list`, `where-list`.

### Coordination protocol
- Each task lists **Depends on:** and **Conflicts with:** at the top. Respect both.
- If two tasks have no overlap listed, they can run in parallel.
- Every task ships as its own PR against `Playground`, title `refactor(classify): <task title>`.
- Do not edit files outside each task's **Touches** list without flagging it in the PR description.

---

## Dependency graph

```
T1 (renderInlineSpan helper) ─┐
T2 (extract special-line)    ─┤  independent — run all in parallel
T3 (centralize corpse rule)  ─┤
T4 (delete actionUtils regex)─┘

          ↓ after T1–T4 land

T5 (canonicalize IDs + kind field) ──→ T6 (split command into kind+location)
```

T1–T4 are small, isolated, parallel-safe. Do them first. T5 is the chain-reaction change — save it for last, one agent, single PR.

---

## T1 — Extract `renderInlineSpan` helper [COMPLETED]

**Goal.** Every `replacer` in [highlighterUtils.ts](../src/utils/highlighterUtils.ts) and [useMessageHighlighter.ts](../src/hooks/useMessageHighlighter.ts) hand-writes a 10-attribute `<span class="inline-btn ...">` string. Centralize the span construction so the attribute schema lives in one place.

**Status:** Completed. Created `src/utils/inlineSpanRenderer.ts` and refactored all sites.

---

## T2 — Move special-line wrappers out of `useMessageHighlighter` [COMPLETED]

**Goal.** `processMessageHtml` currently mixes inline classification (PCs/NPCs/objects in normal log lines) with whole-line wrappers for unrelated features (account menu buttons, quest list, who/where list, comm-sender, stat editor). Extract the wrappers so the highlighter shrinks to its real job.

**Status:** Completed. Created `src/hooks/useSpecialLineWrappers.ts` and migrated 5 logic blocks. Refactored `useMessageHighlighter.ts` to use it and slimmed it down significantly.

---

## T3 — Centralize corpse handling [COMPLETED]

**Goal.** Corpse detection is smeared across 4 sites in the highlighter. Collapse to a single override that runs after initial classification.

**Depends on:** nothing.
**Conflicts with:** T1, T2 (shared file).

**Touches**
- `src/utils/highlighterUtils.ts` (primary)

**Approach**
1. Today's 4 sites:
   - [highlighterUtils.ts:248-268](../src/utils/highlighterUtils.ts#L248-L268) — pre-detect `corpseNpcNames` set
   - [highlighterUtils.ts:305-316](../src/utils/highlighterUtils.ts#L305-L316) — branch inside NPC loop that emits a corpse span instead of an NPC span
   - [highlighterUtils.ts:358-368](../src/utils/highlighterUtils.ts#L358-L368) — generic `corpse` / `corpses` fallback candidate
   - [highlighterUtils.ts:596-601, 614-617](../src/utils/highlighterUtils.ts#L596-L601) — corpse check inside `applyColorTaggedObjects`
   - Room-item loop at [highlighterUtils.ts:381-384](../src/utils/highlighterUtils.ts#L381-L384) also forces `inline-obj-room` for names containing NPC keywords — related edge case
2. Consolidate into a single pure function at the top of `highlighterUtils.ts`:
   ```ts
   // Returns true if this NPC name appears in a "corpse of ..." phrase in the current line.
   const isInCorpseContext = (npcName: string, textOnly: string): boolean => { ... }
   ```
3. In the NPC loop, call `isInCorpseContext` directly (no pre-computed set) and branch on the result. Kept generic, no longer requires pre-indexing.
4. In `applyColorTaggedObjects`, call the same helper.
5. The generic `corpse` / `corpses` fallback candidate stays — it handles the case where no NPC name matched. But pull it next to the corpse helper so it's visually together.
6. The category-force in the room-item loop ("if category includes 'npc', force to obj-room") is a different bug-fix — leave it alone unless you're sure, and note in the PR why.

**Done criteria**
- Only one function reads `textOnly` for corpse detection.
- Manual test: kill an orc, look at the room. "corpse of an orc" — the word "orc" is orange (object) not yellow (NPC), and tapping it opens the corpse menu (Butcher, Drag, Scalp).
- Also test: a live orc and a corpse of an orc in the same room — the live orc stays yellow, the corpse is orange.

**Status:** Completed. Centralized `isInCorpseContext` in `highlighterUtils.ts`.

**Pitfalls**
- The current pre-detect builds a normalized `corpseNpcNames` set *per message*. Make sure the per-call helper stays O(n) in `textOnly` length; don't regress performance for long log lines.
- Stripped names, accents, plurals — the current `normalize` step (NFD + strip combining marks + lowercase) matters. Keep that inside the helper.

---

## T4 — Delete the NPC-type keyword regex in `actionUtils.ts` [COMPLETED]

**Goal.** [actionUtils.ts:68-70](../src/utils/actionUtils.ts#L68-L70) hardcodes a regex for innkeeper / shopkeeper / guildmaster names. This duplicates the keyword arrays in `DEFAULT_INLINE_CATEGORIES`. Remove the duplication — trust the category classification.

**Depends on:** nothing.
**Conflicts with:** nothing (isolated file).

**Touches**
- `src/utils/actionUtils.ts` (primary)
- `src/utils/categorizationUtils.ts` (if a missing keyword needs to be added to the config — read-only most likely)

**Approach**
1. In `isButtonValidForEntity`, the service-button branch (`isServiceButton === true`) currently checks:
   - `entity.capabilities` (good — keep)
   - `fullSetChain.includes(button.setId)` (good — keep)
   - A fallback that greps the NPC name with a hardcoded regex (remove)
2. Replace the fallback with a `getCategoryForName(name, inlineCategories)` call. If the category is `inline-innkeeper` / `inline-shopkeeper` / `inline-guildmaster`, it's a match.
3. Verify every keyword in the deleted regex is already present in the matching category's `keywords` array in `DEFAULT_INLINE_CATEGORIES`. If anything is missing (e.g., "butterbur" is in the regex but not in the config), add it to the config — do not silently drop it.
4. Same treatment for the shopkeeper check at [actionUtils.ts:102-105](../src/utils/actionUtils.ts#L102-L105) (a shopkeeper-presence test for shop commands).

**Done criteria**
- No inline `/innkeeper|barman|.../i` regex remains in `actionUtils.ts`.
- Manual test: walk into the Prancing Pony, tap Butterbur. The innkeeper menu (Offer / Rent / Kill / Consider / Examine) appears. Tap a shopkeeper — shop menu appears. Tap a guildmaster — Practice appears.
- Also test: a custom NPC name the user added to `inline-innkeeper` via settings — should open the innkeeper menu.

**Status:** Completed. Removed regex and replaced with `getCategoryForName` and canonical ID checks.

**Pitfalls**
- The regex uses word-boundary-loose matching (just `/keeper/i.test(name)` style). `getCategoryForName` uses stricter word boundaries. If you find a real NPC name that matched the old regex but not the new category keywords, either add to the category or document why it's lost.
- `roomNpcs` can contain `shortdesc` in addition to `name` — the old code checked `name || shortdesc`. Preserve both inputs to the classifier.

---

## T5 — Canonicalize category IDs and promote `kind` to a hard field [COMPLETED]

**Goal.** Today, whether something is an NPC, player, or object is inferred from 3 overlapping sources: the `categoryType` field on `InlineCategoryConfig`, hardcoded arrays in `getCategoryType`, and hardcoded arrays in `getGlowColorForCategory`. Kill the duplication. Make every category ID canonical (`inline-<something>`) and `kind` a required field.

**Depends on:** T1–T4 (land those first so this agent has a smaller surface).
**Conflicts with:** T6 (run sequentially — T5 then T6).

**Touches** (high blast radius — expect ~15–20 files)
- `src/utils/categorizationUtils.ts` (primary — schema + API)
- `src/types/ui.ts` (`InlineCategoryConfig`)
- `src/utils/buttonHierarchyUtils.ts` (`INLINE_HIERARCHY` keys)
- `src/utils/highlighterUtils.ts` (consumer)
- `src/hooks/useMessageHighlighter.ts` (consumer)
- `src/utils/actionUtils.ts` (consumer — `genericBaseCats`)
- `src/components/Popovers/StandardMenuPopover.tsx` (consumer — `genericBaseCats`, `NPC_SUBCATEGORIES`)
- `src/constants/buttons/inline/*.ts` (button set IDs)
- `src/constants/mastersettings.json` (default saved settings — inlineCategories)
- `src/stores/useSettingsStore.ts` (migration)
- All other files from the `Grep "inlinenpc|inlineplayer|inline-obj-*"` result — audit each

**Approach**
1. **Decide the canonical ID format.** Recommended: `inline-<kind>` for the root of each kind, `inline-<kind>-<sub>` for subcategories. Example:
   - `inline-npc`, `inline-npc-innkeeper`, `inline-npc-shopkeeper`, `inline-npc-mounts`, `inline-npc-guildmaster`
   - `inline-player`
   - `inline-object`, `inline-object-weapon`, `inline-object-armour`, `inline-object-corpse`, `inline-object-container`, …
   - `inline-exit`
2. **Extend `InlineCategoryConfig`:**
   ```ts
   interface InlineCategoryConfig {
     id: string;                  // canonical, always starts 'inline-'
     kind: 'npc' | 'player' | 'object' | 'exit' | 'none';  // required
     parent?: string;             // one id; replaces INLINE_HIERARCHY
     keywords: string[];
     color?: string;              // optional; defaults to kind's color
   }
   ```
3. **Build an ID migration map** — every legacy ID → canonical ID:
   ```ts
   const LEGACY_ID_MAP: Record<string, string> = {
     'inlinenpc': 'inline-npc',
     'npc': 'inline-npc',
     'inline-npc': 'inline-npc',  // already canonical
     'inlineplayer': 'inline-player',
     'player': 'inline-player',
     'pc': 'inline-player',
     'inline-player': 'inline-player',
     'innkeeper': 'inline-npc-innkeeper',
     'shopkeeper': 'inline-npc-shopkeeper',
     'mounts': 'inline-npc-mounts',
     'guildmaster': 'inline-npc-guildmaster',
     'weapon': 'inline-object-weapon',
     // ... full list
   };
   export const canonicalizeCategoryId = (id: string): string => LEGACY_ID_MAP[id] ?? id;
   ```
4. **Rewrite `getCategoryType` and `getGlowColorForCategory`:**
   - `getCategoryType(id)` → split the canonical id on `-`, take the second segment. Done. Delete `OBJ_IDS`, `NPC_FAMILY`, `OBJ_FAMILY`.
   - `getGlowColorForCategory(id)` → walk `parent` links in the config until you find a `color`, else return the kind's default.
5. **Update `INLINE_HIERARCHY`:** migrate keys to canonical IDs. Consider collapsing into `parent` field on each config, then derive the hierarchy dict from the config (single source of truth). Optional — can be a follow-up.
6. **Settings migration.** Bump `SavedSettings.version`. In `useSettingsStore`, on load, run every `InlineCategoryConfig`'s `id` through `canonicalizeCategoryId` and fill in `kind` from the resulting id. Write a test.
7. **Find every string-equal check on the old ids.** Grep for `'inlinenpc'`, `'inlineplayer'`, `'inline-npc'`, `'inline-player'`, `'inline-obj-*'`, `'npc'`, `'pc'`, `'player'` in `src/`. Each callsite: either (a) already on the canonical id, (b) checking a `data-*` attribute from the DOM where the value could be legacy → canonicalize on read, or (c) a local enum that should migrate. Enumerate every hit in the PR description.
8. **Data attribute values in rendered HTML stay canonical from day one** — any code reading `data-cmd` or `data-category` can assume canonical.

**Done criteria**
- Build passes.
- `OBJ_IDS`, `NPC_FAMILY`, `OBJ_FAMILY`, `genericBaseCats` (in both `actionUtils.ts` and `StandardMenuPopover.tsx`), and the legacy-alias branch in `getCategoryType` are all deleted.
- Old `mume app` saved settings load without error (manual test: load a pre-migration settings JSON, verify categories render correctly).
- Full smoke test (see Shared context → How to test your change).

**Status:** Completed. Flattened all IDs to `npc`, `player`, `object` and implemented `kind` field detection. Verified global removal of legacy `inline-` prefixes.

**Pitfalls**
- Saved-settings migration is the high-risk part. Unit test the migration function with real JSON dumps from before and after.
- Some `data-cmd` values on rendered spans are literally the category id (e.g. `data-cmd="inlinenpc"`). These become `data-cmd="inline-npc"`. `useButtonClicks.handleButtonClick` and downstream logic need to accept both during the transition — decide whether to canonicalize at read time permanently or do a one-shot rewrite.
- Button set ids in [src/constants/buttons/inline/*](../src/constants/buttons/inline/) use the old ids. Renaming them is fine but requires touching every `setId` / `CATEGORY_BUTTON_MAP` entry.
- Do *not* rename the button *filenames* (`items.ts`, `npcs.ts`, `world.ts`) — just contents.

---

## T6 — Split command into `kind` + `location` data attributes

**Goal.** Today `data-cmd` values like `inline-obj-room`, `inline-obj-char`, `inline-obj-worn`, `inline-obj-shop` mash together *what* a thing is (object) with *where* it is (room / inventory / worn / shop). Separate them so action filtering can read each axis directly.

**Depends on:** T5 (needs canonical IDs and `kind` field).
**Conflicts with:** T5 (run after T5 is fully merged).

**Touches**
- `src/utils/inlineSpanRenderer.ts` (if created in T1) or the helper's current home
- `src/utils/highlighterUtils.ts`
- `src/hooks/useMessageHighlighter.ts`
- `src/utils/actionUtils.ts` (`locationSource` resolution — big simplification here)
- `src/components/Popovers/StandardMenuPopover.tsx`
- `src/hooks/interactions/useButtonClicks.ts`

**Approach**
1. Add two new data attributes to every inline span:
   - `data-kind` — `player | npc | object | exit` (from T5's `kind` field)
   - `data-location` — `room | carried | worn | shop | none` (new axis)
2. Emit both at span creation time. Example: a room item that's a weapon gets `data-kind="object" data-category="inline-object-weapon" data-location="room"`.
3. Rewrite [actionUtils.ts:150-161](../src/utils/actionUtils.ts#L150-L161) (`locationSource` logic) to read `data-location` directly when available, with a fallback mapping from legacy values for old cached HTML.
4. Update `getHierarchyChain` — today it branches on `setId === 'inline-obj-room' | 'inline-obj-char' | 'inline-obj-worn'`. Those become `location === 'room' | 'carried' | 'worn'`. The chain becomes: base object actions + location-specific actions (get for room, drop/wear for carried, remove for worn) + category-specific actions (the detected subcategory's chain).
5. The old `data-cmd` values (`inline-obj-room` etc.) can either (a) stay as a composite for back-compat, or (b) be eliminated in favor of `data-kind` + `data-location` + `data-category`. Recommend (b) — fewer moving parts.

**Done criteria**
- Full smoke test (see Shared context) passes.
- `actionUtils.ts` no longer has the 8-way if/else over `locationSource`.
- `getHierarchyChain` splits cleanly into `base + location + category` assembly, no location strings baked into category ids.
- `StandardMenuPopover` uses `popoverState.location` (new field on `PopoverState`) instead of inspecting `setId` strings.

**Pitfalls**
- `PopoverState.setId` is used as *both* a location marker and a button filter today — when you split, every consumer that writes `setId` needs auditing. Grep `setPopoverState(` for every callsite.
- Drawers (`InventoryDrawer`, `EquipmentDrawer`) also open the popover with hardcoded setIds — make sure they pass the new `location` field.
- Cached log HTML in `cacheRef` contains old data attributes. Bump `highlightVersion` on deploy so the cache invalidates.

---

## Out of scope for now (but noted)

- **Collapsing the multi-pass highlighter into a single AST pass.** Big win in theory (one traversal instead of 8+), but touches the regex cache, cache invalidation, and every replacer. Revisit after T5/T6 land and we can see what the simplified code actually needs.
- **Moving hierarchy into the config itself** (replacing `INLINE_HIERARCHY` dict with a `parent` field per category). Mentioned as optional under T5. Safe follow-up once T5 lands.
- **Unifying `CATEGORY_BUTTON_MAP` and `INLINE_HIERARCHY`.** They both answer "what buttons apply to this category?" from different angles. Untangling is a separate design conversation.
