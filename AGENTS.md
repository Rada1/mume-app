# AGENTS.md: AI Orchestration & Developer Blueprint

This document is the primary onboarding and operational guide for AI agents (Gemini CLI, Jules, etc.) and human developers. It defines the system's "Mental Model" to ensure high-speed, high-accuracy contributions.

## 🧠 System Mental Model
The MUME Client is an **AI-Native, Hook-Driven Mobile Client** for the MUME MUD.
- **State First:** `GameContext.tsx` is the single source of truth for HP, Mana, Target, and Inventory.
- **Headless Logic:** Business logic (parsing, telnet, commands) MUST live in custom hooks (`src/hooks/`).
- **Thin UI:** Components are for rendering only. If you see logic in a component, refactor it into a hook.

## 🛠️ Essential AI Constraints (From ARCHITECTURE.md)
1.  **300-Line Mandate:** No file exceeds 300 lines. If it does, decompose it.
2.  **Zero-Any Policy:** Use `src/types/index.ts` for all interface definitions. Never use `any`.
3.  **Self-Explaining Code:** Every file requires a `@file` header and clear `// --- Logic Section ---` separators.

## 🎯 Strategic File Map for Agents
| If you want to... | Look here first... |
| :--- | :--- |
| **Change Game Logic** | `src/hooks/useGmcpHandlers.ts`, `src/hooks/useGameParser.ts` |
| **Modify Button Behavior** | `src/hooks/useButtonLogic.ts`, `src/hooks/useInteractionHandlers.ts` |
| **Update Global State** | `src/context/GameContext.tsx`, `src/types/index.ts` |
| **Fix UI/Layout** | `src/components/Layout/`, `src/styles/layout.css` |
| **Edit Command Flow** | `src/hooks/useCommandController.ts`, `src/hooks/useCommandExecutor.ts` |
| **Adjust Mapper** | `src/components/Mapper/`, `src/mapper/renderer.ts` |

## 🚀 Efficiency Shortcuts for AI
- **GMCP over Text:** Always prefer GMCP data updates over regex-parsing game text when possible.
- **Surgical Edits:** Use the `replace` tool by targeting the `// --- Section ---` comments.
- **Validation:** Always verify changes by checking for TypeScript errors and running a build.

## 🔄 Self-Updating Requirement
When you add a major feature or change a core API, you **MUST** update:
1.  `ARCHITECTURE.md` (if standards change)
2.  `GEMINI.md` (if CLI-specific discovery paths change)
3.  This file (`AGENTS.md`) (if the "Mental Model" or "Strategic Map" changes)

---
*Created for the MUME AI Studio App to empower autonomous engineering.*
