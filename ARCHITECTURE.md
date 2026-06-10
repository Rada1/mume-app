# MUME Client: AI-Native Architecture Standards

This document defines the strict coding standards required to keep this codebase "Agent-Friendly" and maintainable for both humans and AI.

## 1. The 300-Line Mandate
- **Limit:** No source file (`.ts`, `.tsx`, `.css`) should exceed **300 lines of code**.
- **Enforcement:** If a file grows beyond 300 lines, it is a signal that the component or hook is doing too much.
- **Action:** Decompose logic into sub-hooks (`src/hooks/`) or sub-components (`src/components/`).

## 2. Organized Folder Structure (Feature-Based)
To prevent "File Sprawl" caused by the 300-line rule, files must be organized into semantic folders.
- **Rule:** If a feature (like the Mapper or Settings) requires multiple files, they should be grouped into a dedicated folder (e.g., `src/components/Mapper/` or `src/hooks/Settings/`).
- **Hierarchy:** Prefer deep, organized folders over a flat, cluttered directory. Each major folder should ideally contain its own `README.md` explaining the files within.

## 3. Extreme Code Clarity
Every file and block of code must be "Self-Explaining" to ensure both AI and human developers can navigate it instantly.

### File Headers
Every file must start with a concise header:
```typescript
/**
 * @file [FileName]
 * @description [1-2 sentences explaining the Single Responsibility of this file.]
 */
```

### Logic Chunking
Use clear, visual separators for logical blocks within a file. This helps AI agents use the `replace` tool accurately:
```typescript
// --- GMCP Vitals Parsing ---
// Logic for handling HP/Mana updates...

// --- Movement Failure Logic ---
// Logic for handling "Alas, you cannot go that way"...
```

## 4. The "Self-Updating" Rule
- **Mandate:** AI Agents (and humans) MUST update `GEMINI.md` and `ARCHITECTURE.md` whenever a major structural change occurs.
- **Structural Changes include:** Adding a new Context Provider, a new UI Layer, or refactoring a core Hook's API.

## 5. State & Logic Separation
- **Context (`src/context/`):** Shared game and UI state (HP, target, drawer status).
- **Hooks (`src/hooks/`):** Headless business logic (Networking, Parsing, Command Controller).
- **Components (`src/components/`):** Pure "Presentational" layers. They should be "thin" and only handle rendering.
- **Shaper (`src/shaper/`):** Privileged builder workspace. Domain model, validation, and future collaboration/deploy logic stay headless under `model/`, `hooks/`, `collaboration/`, or `deployment/`; components only render the builder UI.

## 6. Type Safety (Zero-Any)
- **Rule:** The use of `any` is strictly prohibited.
- **Process:** If a complex object (like a GMCP packet) arrives, define its interface in `src/types/index.ts` first.

## 7. Capability-Based Entity System
To ensure reliable inline button menus and consistent visuals, the application uses a centralized **Entity Registry**.
- **The Registry (`src/hooks/useEntityRegistry.ts`):** The Single Source of Truth. It scans entities (NPCs, Items, Players) once and assigns them **Capabilities** (e.g., `isVendor`, `isWeapon`, `isWearable`).
- **Data-Driven Actions (`src/utils/actionUtils.ts`):** Decisions on which buttons to show are made by mapping Capabilities to Button Sets.

## 8. Inline Action Model
Inline log actions must resolve through this invariant:
```text
inline entity -> category -> traits -> buttons
```
- **Categories:** Classify the entity (`cat-enemy`, `cat-npc`, `cat-inventory-object`) and own default trait IDs.
- **Traits:** Reusable action bundles (`trait-combat`, `trait-examine`, `trait-container`) and own button IDs.
- **Buttons:** Concrete commands (`btn-kill`, `btn-examine`).
- **Legacy Support:** `inline-*` IDs are compatibility aliases only. New inline action logic belongs in `src/utils/inlineActionModel.ts`.
- **Forbidden Shortcut:** Do not attach buttons or button sets directly to categories. Use category -> trait -> button resolution.
## 9. Interactive Highlighting Standards
To maintain UI precision and prevent "highlight sprawl," the text parsing pipeline follows strict rules for entity detection:
- **Keyword-First:** Entities (NPCs, Players) must only be highlighted based on their specific `keyword` or derived `noun`. Never highlight full descriptive strings (e.g., "A tall man...").
- **Word Boundaries:** All regex matches in the `Tokenizer` must use word boundaries (`\b`) to prevent partial word matches and overlapping interactive spans.
- **Null Safety:** Rendering logic in the Mapper and Interaction utilities must implement defensive null checks (e.g., `(color || '')`) to remain robust against incomplete GMCP packets during rapid room transitions.

## 10. Shaper Access Boundary
Shaper Mode is a privileged building surface, not a normal player feature.
- **Fail Closed:** Shaper must stay hidden unless `canAccessShaper()` returns true.
- **No Direct Deploy:** Draft editing, validation, command preview, and future MCP tools must not bypass human-approved deploy locks.
- **Concept First:** Shaper edits operate on concept drafts. Live map/game state is baseline/reference data unless deployment explicitly applies commands.
