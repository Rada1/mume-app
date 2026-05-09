# Inline Buttons Refactor

## Goal

Make inline log buttons follow one simple rule everywhere:

```text
inline entity -> category -> traits -> buttons
```

Categories classify what a detected log entity is. Traits are reusable action bundles. Buttons are concrete commands. Categories must not own button sets or button IDs directly.

## Glossary

- **Inline entity:** Clickable text detected in the game log, mapper, drawers, or related UI.
- **Category:** The primary identity of an inline entity, such as `cat-enemy`, `cat-npc`, or `cat-inventory-object`. Categories own default trait IDs and visual identity.
- **Trait:** A reusable action/capability bundle, such as `trait-combat`, `trait-examine`, or `trait-container`. Traits own button IDs and keywords, but never colors.
- **Button:** A concrete action, such as `btn-kill` or `btn-examine`.
- **Context/location:** Runtime facts such as room, carried, worn, shop, or remote. Context may add or filter traits, but it should not skip traits and attach buttons directly.
- **Button set:** Legacy/editor storage concept. It should not be the domain model for inline actions.

## Invariants

1. Category configs use `defaultTraitIds`, never direct button IDs.
2. Trait configs use `buttonIds`.
3. Menu generation should resolve through category -> traits -> buttons.
4. Legacy `inline-*` IDs are accepted only through compatibility aliases during migration.
5. CSS names like `.inline-btn` may stay because they describe rendering, not domain identity.
6. Colors belong to categories only. Traits must not define or persist color.

## Migration Phases

1. Add new category and trait types/defaults beside the legacy system.
2. Add alias helpers so old `inline-*` saved data still resolves.
3. Route action validation and menu grouping through trait button IDs.
4. Update settings UI to show selected traits and resolved buttons.
5. Migrate persisted settings to `cat-*` and `trait-*` names.
6. Remove `InlineCategoryConfig.buttonSetId`, `CATEGORY_BUTTON_MAP`, and category-owned button set assumptions.
7. Rename remaining hardcoded runtime category IDs after behavior is stable.

## Current Checkpoint

- Added `src/utils/inlineActionModel.ts` as the first source of truth for category/trait/button relationships.
- Routed `src/utils/actionUtils.ts` through resolved trait button IDs while keeping legacy button sets as fallback.
- Routed list and dial popover menu grouping through resolved trait sections where possible.
- Updated the inline popover trait panel to show `Category - Traits - Buttons` and list each trait's contributed buttons.
- Updated `TraitSettings.tsx` to display traits as button providers instead of category-owned button sets.
- Updated `CategoryTraitCards.tsx` to show category-selected traits and the buttons each selected trait contributes.
- Added `defaultTraitIds` as a temporary persisted bridge on `InlineCategoryConfig` for category trait overrides.
- Updated `GeneralSettings.tsx` category cards and category color overrides to use canonical `cat-*` IDs.
- Removed `DEFAULT_INLINE_CATEGORIES` / `getButtonSetIdForCategory` from the standard popover flow.
- Updated `useEntityRegistry.ts` capability detection to use the new trait/category aliases.
- Removed color from the new `TraitConfig` model and from trait settings/toggles.
- Updated token and popover color resolution to use category-only color helpers.
- Updated color-tagged highlighter output to assign canonical `cat-*` categories from kind/location.
- Updated mapper occupant target categories to use canonical `cat-*` aliases.
- Updated `useSpecialLineWrappers.ts` and `PromptBox.tsx` off legacy category/glow helpers.
- Fixed a menu/picker inconsistency where trait sections still pulled buttons from legacy set IDs. Action menu sections and shared action validation now prefer `trait.buttonIds`, the trait picker highlights all resolved traits including category defaults, and legacy aliases are prevented from reappearing as separate fallback sections.
- Replaced the duplicated default list in `categorizationUtils.ts` with compatibility adapters over `inlineActionModel.ts`.
- Removed the unused `CATEGORY_BUTTON_MAP`; trait configs now own button membership.
- Added a trait-record discriminator so category overrides stored in `inlineCategories` do not show up as fake custom traits.
- Bumped settings persistence to version 3 and normalize saved category/trait IDs toward `cat-*` / `trait-*` on load.
- Removed legacy fallback sections such as `GENERAL` from standard inline menus when resolved traits exist, so action-menu sections must correspond to visible traits.
- Removed `buttonHierarchyUtils.ts`; standard and dial inline menus now derive action membership from resolved traits/button IDs instead of legacy set inheritance.
- Added a side trait filter rail to standard inline action menus. Selecting a trait narrows the action menu to that trait's buttons; `*` returns to all traits.

## Current Checkpoint (continued)

- Updated `classifyOccupant.ts` to emit canonical `cat-*` IDs (`cat-ally`, `cat-enemy`, `cat-neutral`, `cat-npc`) instead of legacy `inline-*` strings. NPC subtypes (shopkeeper, innkeeper, mount, guildmaster, trainer, guard) all resolve to `cat-npc`; their specific trait is discovered later via keyword matching on the entity name. `CharCategory` type now only contains the four canonical `cat-*` IDs. Updated the test suite to match.
- Updated `Tokenizer.ts` to emit canonical `cat-*` IDs in all three code paths: `handleText` registered-player path (`cat-ally`), `tokenizeKnownOccupants` GMCP path (via `toCategoryId`), and `emitEntity` XML tag path (all six object/character/room/exit category strings). The `metadata.type` override now resolves via `toCategoryId` alias lookup instead of the `inline-${t}` template. Updated the test suite to match.
- Migrated all remaining `inline-*` string literals in non-emitter files to canonical `cat-*` IDs: `playerLineTokens.ts` (who/where row tokens), `useCaptureParser.ts` (inventory/equipment entity registration), `useMessageRouter.ts` (room object entity registration), `useButtonClicks.ts` and `useLogClicks.ts` (character-context detection now uses `toCategoryId` + `cat-*` includes instead of `startsWith` prefix array). Also updated the `btn-worn-remove`/`btn-worn-examine` button `setId` fields to `cat-worn-object` to match the worn-source detection check in `useButtonClicks.ts`.
- Cleaned up a bad settings-store merge: removed duplicated `SettingsState` members, restored a valid NPC color default, and changed the XML room override to emit `cat-room`.
- Added explicit persisted `CategoryOverride` and `CustomTraitConfig` types. `useSettingsStore` now persists `categoryOverrides` and `customTraits` at version 4, migrates old `inlineCategories` into those buckets, and recomposes `inlineCategories` only as a temporary compatibility view for existing callers. Custom traits preserve their `buttonIds` through this bridge.
- Moved the visible button settings editor off the mixed `inlineCategories` write path. `ButtonSettings`, `CategoryTraitCards`, and `TraitSettings` now edit `categoryOverrides` and `customTraits` directly, so the settings UI mirrors the intended model: categories choose traits; traits own buttons/keywords.
- Moved the inline popover trait picker off `setInlineCategories`. Keyword assignment now writes through `setCustomTraits`, so adding/removing a trait for a clicked log entity no longer stores fake category records.

## Known Remaining Work

- `InlineCategoryConfig` still contains legacy fields such as `buttonSetId`, though core menu behavior no longer depends on category-owned button maps.
- Runtime parser/rendering callers still read the compatibility `inlineCategories` view for color/trait resolution; those can move to explicit category/trait records after the context type is widened.
- `SetManagerModal` still receives the compatibility category array for its older category editor surface.
- `categorizationUtils.ts` still exists as a legacy compatibility module for highlighting and older call sites.
- `npm run typecheck` currently fails on unrelated pre-existing errors in Header, mapper props, settings map handler, session state, GMCP event typing, vitals typing, and spectate store code.
