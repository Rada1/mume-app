# GEMINI MUD Client: Architectural Overview

This document provides a high-level overview of the MUME application's architecture to aid AI-driven development and refactoring.

## 📜 Self-Updating Mandate
**CRITICAL:** Any major structural changes (new hooks, new context providers, new UI layers, or API changes to core services) **MUST** be reflected in this document immediately by the developer (AI or human).

## Core Principles
- **Modularity**: Business logic is strictly separated into custom React hooks (`src/hooks/`).
- **Layered UI**: The main entry point (`src/index.tsx`) is a thin orchestrator that delegates to semantic layers in `src/components/Layout/`.
- **Type Safety**: A "Zero-Any" policy is enforced across the codebase.
- **Consolidated UI State**: All shared game and UI states are centralized in `GameContext.tsx`.
- **Immersion Mode**: A master toggle (enabled by default) that synchronizes weather, lighting, 3D scroll effects, and smooth animations. Managed via `isImmersionMode` in `GameContext.tsx`.

## 🎯 Feature Mapping (Where to look first)

To minimize token usage and skip "whole codebase" searches, use this map:

### 🎮 Game State & UI Context
- **Central State (HP, Mana, Target, Inventory):** `src/context/GameContext.tsx`
- **Map & Exploration State:** `src/context/MapperContext.tsx`
- **User Input & Command History:** `src/context/InputContext.tsx`
- **Spectate & Snoop Queue:** `src/context/GameContext/state.ts` (spectateQueue, lastSnoopStartTime)
- **Entity Registry (NPCs, Players, Items):** `src/hooks/useEntityRegistry.ts` (Source of Truth)
- **User Settings & Persistence:** `src/hooks/useSettings.ts`, `src/context/GameContext/useSettingsState.ts`
- **Global Types & Interfaces:** `src/types/index.ts`

### 🏗️ UI & Layout
- **Main App Shell:** `src/index.tsx`
- **Core Layout Layers:** `src/components/Layout/` (Atmospheric, HUDClusters, MainContent, Modals)
- **HUD Components:** `src/components/Layout/HUD/` (MapperCluster, StatsCluster, LineCluster, GroupDrawer)
- **Side Drawers (Inventory, Equipment, Stats):** `src/components/Drawers/`
- **Inline Button Popovers:** `src/components/Popovers/StandardMenuPopover.tsx`
- **Mapper Component:** `src/components/Mapper/` (and `src/mapper/renderer.ts`)

### 🧠 Logic & Networking
- **Low-level Telnet/GMCP:** `src/hooks/useTelnet.ts`
- **GMCP Data Handling:** `src/hooks/useGmcpHandlers.ts`
- **Game Output Parsing (Text):** `src/hooks/GameParser/useGameParser.ts` (Orchestrator)
- **Parser Sub-Hooks:** `src/hooks/GameParser/` (Combat, Comm, Room, Stat, Atmosphere, Prompt, etc.)
- **Action Filtering:** `src/utils/actionUtils.ts` (Capability -> Button Map)
- **Command Parsing (User Input):** `src/services/parser/services/mudParser.ts`
- **Message Log & Combat:** `src/hooks/useMessageLog.ts`
- **Command Control (Sending to Game):** `src/hooks/useCommandController.ts`
- **Specialized Handlers:** `usePracticeHandler.ts`, `useShopHandler.ts`, `useQuestsHandler.ts`
- **Buttons & UI Interactions:** `useButtons.ts`, `useSpatButtons.ts`, `useInteractionHandlers.ts`, `useViewport.ts`
- **Spectate Automation (Rotation/Tells):** `useSpectateAutomator.ts`
- **Advanced Processing:** `useTriggerProcessor.ts`, `useKeywordOverrides.ts`, `useMessageHighlighter.ts`
- **Audio & Atmosphere:** `useAtmosphereAudio.ts`, `useSoundSystem.ts`, `useZoneMusic.ts`, `useWeatherSounds.ts`, `useTerrainSounds.ts`

## 🛠️ Common Tasks Cheat Sheet

| Task Type | Files to Open |
| :--- | :--- |
| **Add a New Command** | `useCommandController.ts`, `GameContext.tsx` |
| **Fix a Layout Issue** | `src/components/Layout/`, `src/styles/layout.css` |
| **Handle a New GMCP Packet** | `useGmcpHandlers.ts`, `GameContext.tsx`, `types/index.ts` |
| **Change Message Styling** | `useMessageLog.ts`, `useMessageHighlighter.ts`, `MessageLog.css` |
| **Fix Inline Button Menus** | `actionUtils.ts`, `useEntityRegistry.ts` |
| **Update Parser Logic** | `src/hooks/GameParser/`, `useGameParser.ts` |
| **Add a New Modal/Setting** | `ModalsLayer.tsx`, `useSettings.ts`, `SettingsModal.tsx` |
| **Update Button Logic** | `useButtons.ts`, `useButtonLogic.ts`, `ButtonUtils.ts` |
| **Adjust Audio/Atmosphere** | `useAtmosphereAudio.ts`, `useSoundSystem.ts`, `useZoneMusic.ts` |
| **Modify Drawers/UI Tabs** | `src/components/Drawers/`, `DrawerManager.tsx` |

## 🚫 Avoid Scanning (Use .geminiignore)
- **Data/Logs:** Do NOT open `.txt`, `.xml`, `.mm2`, or large `.json` files in the root.
- **Scripts:** Ignore `.py` scripts unless specifically asked to refactor the build process.
- **Assets:** Never scan `public/assets/`.

## Command Flow
1. **User Interaction**: Triggered via `InputArea`, `CustomButton`, or `SwipeGesture`.
2. **Controller Logic**: `useCommandController` determines the command type and applies target substitution.
3. **Network Layer**: `useTelnet` sends the final string to the server.
4. **Response Handling**: Server sends GMCP/Text; `useTelnet` notifies listeners; UI updates via `GameContext`.

## Development Guidelines
- **Mandatory Reading**: Refer to `ARCHITECTURE.md` for strict coding standards (300-line limit, etc.).
- **GMCP First**: Prefer GMCP data over text parsing for all game state updates.
- **Thin Components**: Logic belongs in hooks; components should only handle rendering.

