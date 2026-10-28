# Archived mobile category-chip command layout

Snapshot taken before the twelve-tile mobile experiment on October 27, 2026.
The `src/` subtree contains exact copies of the prior command panel, branches,
category chips, controller and mobile layout styles, including uncommitted work.

## Restore the prior mobile layout

Restore `src/components/HUD/CommandPanelV2.tsx` and
`src/components/HUD/CommandPanelV2Branches.tsx` from this snapshot to their matching
project paths. Those two files are the integration points for the experiment.
The archived category component, hook and styles are still live for desktop.
Only restore the additional snapshots if those files have subsequently changed;
review intervening work before copying them back.

The experiment's files are `MobileCommandTiles.tsx`, `MobileCommandTiles.css`,
`useMobileCommandTiles.ts`, `mobileCommandTiles.ts`, `MobileTileCommandPicker.tsx`,
`useMobileTileGestures.ts`, `useMobileCommandTileLayout.ts`,
`useMobileTileCommandLayout.ts`, `useHeldCommandExecution.ts`, `useHeldTargetFeedback.ts`,
`useHeldCommandEdgeScroll.ts`, `useMobileTileArrangement.ts`, `mobileTileAssignments.ts`, `MobileCommandTargets.css` and
`useMobileCommandTilesStore.ts`. Once both integration files are restored,
these become unused. Its bindings use the independent local storage key
`mume-mobile-command-tiles-v1`; the old category preferences and Pro mode
assignments are preserved.

Run `npm run build` and `npm run typecheck` after restoring.
