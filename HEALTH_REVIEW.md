# Codebase Health Review: Agent-Friendliness

## Overview
This review assesses the current state of the MUME codebase, focusing on its maintainability and how well it supports development by AI agents. Based on the `ARCHITECTURE.md` guidelines, the primary focus is on token reduction, logic chunking, and strict type safety.

## 1. Type Safety ("Zero-Any" Policy)
The codebase generally adheres to strict TypeScript typing. However, a few compilation errors were present during the initial check:
- Missing Vite module declaration for markdown files (`*.md?raw`).
- An outdated property (`promptLeft`) passed to a component in `SpatButtons.tsx`.
- A missing optional parameter (`force`) in the `setInCombat` type definition in `GmcpDecoder.ts`.

**Status:** Fixed ✅. All `tsc` checks now pass cleanly. Maintaining this zero-error baseline is critical for AI context, as type errors often lead agents down hallucinated debugging paths.

## 2. The 300-Line Mandate
Several core files exceed the 300-line limit mandated in `ARCHITECTURE.md`. Large files consume significant token context and make it difficult for AI to apply precise patch updates (via diffs or replace blocks).

**Top Violators Found:**
1. `src/components/Mapper/useMapperRenderer.ts` (525 lines)
2. `src/components/Drawers/EquipmentDrawer.tsx` (461 lines)
3. `src/components/Settings/GeneralSettings.tsx` (404 lines)
4. `src/context/GameContext.tsx` (409 lines)

### Actions Taken
- **`EquipmentDrawer.tsx`**: Promoted to a folder structure (`src/components/Drawers/EquipmentDrawer/`). Extracted the complex rendering logic for individual list items into a new sub-component, `EquipmentDrawerLine.tsx`. This reduced the main file size and improved chunking.
- **`useMapperRenderer.ts`**: Moved into `src/components/Mapper/renderer/` to begin decomposing the massive `drawMap` function into smaller helpers in the future.

### Recommendations for Future Refactoring
- **`GameContext.tsx`**: Break this down into separate contexts (e.g., `PlayerVitalsContext`, `WorldEnvironmentContext`, `UISettingsContext`) or extract the massive dispatch/state initializers into separate files within a `src/context/GameContext/` folder.
- **`useMapperRenderer.ts`**: The `drawMap` function is over 300 lines by itself. Extract the logic for rendering the background grid, the blob terrain (`drawBlobTerrain`), and the room connections/paths into separate internal functions within the `renderer` folder.

## 3. Agent-Friendly Structure and Context
The project benefits greatly from the clear directives in `ARCHITECTURE.md` and `GEMINI.md`.

**Recommendations for Context Optimization:**
1. **File Headers:** Enforce the rule mentioned in `ARCHITECTURE.md`: Every file must start with a `/** @file ... */` block. Many files currently lack these. AI agents use these headers to quickly determine if a file is relevant to their current task without reading the whole file.
2. **Logic Separators:** Continue using visual separators (e.g., `// --- Section Name ---`) within files. This acts as an anchor for search-and-replace tools.
3. **Avoid Prop Drilling:** In `EquipmentDrawer.tsx`, heavily nested inline event handlers (like `onDrop` and `onPointerUp`) make the JSX very dense. Moving these handlers out of the return statement and into named functions (e.g., `const handleDrawerDrop = ...`) will significantly improve the success rate of Git merge diffs used by AI.

## Conclusion
The codebase is healthy but shows signs of "feature bloat" in core UI components. By strictly enforcing the 300-line limit and breaking down massive render functions, you will significantly reduce token usage and improve the speed and accuracy of AI agents working on the project.
