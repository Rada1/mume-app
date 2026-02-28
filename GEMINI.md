# GEMINI MUD Client: Architectural Overview

This document provides a high-level overview of the MUME application's architecture to aid AI-driven development and refactoring.

## Core Principles
- **Modularity**: Business logic is separated into custom React hooks (e.g., `useTelnet`, `useCommandController`, `useMessageHighlighter`).
- **Type Safety**: The project follows a "Zero-Any" policy, particularly for network data (GMCP).
- **Consolidated UI State**: Modal and drawer states are centralized in a single `ui` object within `index.tsx` to ensure predictable behavior.

## Key Components

### Hooks Area (`src/hooks/`)
- **`useTelnet.ts`**: Handles the raw WebSocket/Telnet connection, GMCP subnegotiation, and ANSI decoding.
- **`useCommandController.ts`**: The central brain for interaction. Handles button clicks, swipe gestures, and command execution (including target substitution).
- **`useMessageHighlighter.ts`**: Processes raw message HTML to add interactive elements (popovers, highlighting) based on game state.
- **`useEnvironment.tsx`**: Manages weather, lighting, and environmental audio/visual effects. Updates based on GMCP.

### Components Area (`src/components/`)
- **`index.tsx`**: The main entry point. Primarily responsible for layout, high-level hook setup, and passing dependencies.
- **`Mapper.tsx`**: A performant 2D/3D map engine using Canvas. Handles room discovery and automatic navigation.
- **`Popovers/PopoverManager.tsx`**: Centralized manager for all contextual menus (teleport, menus, target selection).
- **`Drawers/DrawerManager.tsx`**: Handles side-panel components like Stats, Equipment, and Inventory.

### Types Area (`src/types/index.ts`)
- All shared interfaces are defined here, including strict GMCP data structures (`GmcpCharVitals`, `GmcpRoomInfo`, etc.).

## Command Flow
1. **User Interaction**: Triggered via `InputArea`, `CustomButton`, or `SwipeGesture`.
2. **Controller Logic**: `useCommandController` determines if the command is a move, a target setting, or a MUD command.
3. **Network Layer**: `useTelnet` sends the final string to the server.
4. **Response Handling**: Server sends GMCP/Text; `useTelnet` notifies listeners; UI updates via hooks.

## Development Guidelines
- **Avoid `any`**: Always use or define a specific interface in `src/types/index.ts`.
- **Refactor Heavy Logic**: If `index.tsx` starts growing handling functions, move them to a dedicated hook.
- **GMCP First**: Prefer GMCP data over text parsing for game state (HP, Weather, Lighting).
