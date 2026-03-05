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

## 6. Type Safety (Zero-Any)
- **Rule:** The use of `any` is strictly prohibited.
- **Process:** If a complex object (like a GMCP packet) arrives, define its interface in `src/types/index.ts` first.
