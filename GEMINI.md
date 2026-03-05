# GEMINI MUD Client: Architectural Overview
# GEMINI MUD Client: Architectural Overview

This document provides a high-level overview of the MUME application's architecture to aid AI-driven development and refactoring.

## 📜 Self-Updating Mandate
**CRITICAL:** Any major structural changes (new hooks, new context providers, new UI layers, or API changes to core services) **MUST** be reflected in this document immediately by the developer (AI or human).

## Core Principles
- **Modularity**: Business logic is strictly separated into custom React hooks (`src/hooks/`).
- **Layered UI**: The main entry point (`src/index.tsx`) is a thin orchestrator that delegates to semantic layers in `src/components/Layout/`.
- **Type Safety**: A "Zero-Any" policy is enforced across the codebase.
- **Consolidated UI State**: All shared game and UI states are centralized in `GameContext.tsx`.

## Key Components

### UI Layout Layers (`src/components/Layout/`)
- **`AtmosphericLayer.tsx`**: Manages environmental effects (Weather, Lightning, Fog).
- **`MainContentLayer.tsx`**: Orchestrates the core game log and primary map views.
- **`HUDClustersLayer.tsx`**: Handles all user-facing controls (Buttons, Joysticks, Input).
- **`ModalsLayer.tsx`**: Manages overlay states (Settings, Button Editors, Managers).

### Logic Hooks Area (`src/hooks/`)
- **`useTelnet.ts`**: The low-level networking layer. Handles GMCP and ANSI decoding.
- **`useCommandController.ts`**: The "Brain" of the app. Translates UI actions into game commands.
- **`useGameParser.ts`**: Interprets raw MUD output into structured state updates (Inventory, Equipment, Stats).
- **`useMessageLog.ts`**: Manages the high-frequency message buffer and combat line detection.

### Data & Types (`src/types/index.ts`)
- All shared interfaces are defined here, ensuring strict consistency across the networking and UI layers.

## Command Flow
1. **User Interaction**: Triggered via `InputArea`, `CustomButton`, or `SwipeGesture`.
2. **Controller Logic**: `useCommandController` determines the command type and applies target substitution.
3. **Network Layer**: `useTelnet` sends the final string to the server.
4. **Response Handling**: Server sends GMCP/Text; `useTelnet` notifies listeners; UI updates via `GameContext`.

## Development Guidelines
- **Mandatory Reading**: Refer to `ARCHITECTURE.md` for strict coding standards (300-line limit, etc.).
- **GMCP First**: Prefer GMCP data over text parsing for all game state updates.
- **Thin Components**: Logic belongs in hooks; components should only handle rendering.

