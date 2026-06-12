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
| **Plan or Build Shaper Mode** | `docs/shaper.md`, `src/shaper/`, `src/shaper/access/shaperAccess.ts` |
| **Generate Shaper Room Prose** | `src/shaper/model/shaperRoomProse.ts`, `scripts/print_shaper_prose_context.js`, `scripts/apply_shaper_room_prose.js` |
| **Fix Broad Highlighting** | `src/services/parser/Tokenizer.ts`, `src/hooks/useEntityRegistry.ts` |
| **Spectate Rotation** | `src/hooks/useSpectateAutomator.ts`, `src/hooks/GameParser/useGameParser.ts` |
| **Manage Entity Traits** | `src/utils/inlineActionModel.ts`, `src/utils/categorizationUtils.ts`, `src/components/Settings/TraitSettings.tsx` |

## Inline Action Model
Inline log actions must always follow:

```text
inline entity -> category -> traits -> buttons
```

Categories classify entities and own default trait IDs. Traits own button IDs. Do not attach buttons or button sets directly to categories; legacy `inline-*` IDs are compatibility aliases during migration.

## Shaper Mode
Shaper Mode is a privileged concept-building workspace, not a normal player-facing client mode. Keep its domain model, validation, collaboration, and deploy logic under `src/shaper/` as headless logic with thin components. Its entry point must remain hidden unless `canAccessShaper()` allows access.

## 🛠️ Team Lead Skill (Orchestrator Only)
Antigravity acts as the **Team Lead**, delegating background tasks to **Jules** via the Gemini CLI.
- **Skill**: `team-lead` (defined in `.gemini/skills/team-lead/SKILL.md`).
- **Delegation**:
  - **Antigravity (Tactical)**: UI, interactive debugging, immediate state fixes, code review.
  - **Jules (Background)**: Large refactors (>300 lines), full test suites, dependency audits.
- **Workflow**:
  1. `gemini -p "/jules [TASK]"` to launch.
  2. `git fetch origin && git merge origin/[JULES_BRANCH]` to integrate.
  3. Validate with `npm run build`.

## 🧪 Automated Testing Skill (Agent Only)
The Antigravity agent can log in autonomously to verify UI and logic changes.
- **Config**: Root `config.agent.json` (gitignored). Contains `account`, `password`, and `play_command`.
- **Character**: Use `ellessar` (God character) for testing.
- **Boot Sequence**:
  1. Open `http://localhost:3000`.
  2. Wait for `By what name...?`. 
  3. Enter Account Name.
  4. Wait for `Password:`. 
  5. Enter Password.
  6. Handle paginators/MOTD by sending empty newlines.
  7. Type `play ellessar` at the account prompt.
- **Verification**: Check `MessageLog.tsx` or the browser console for successful login triggers.

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
