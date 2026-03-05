# Hooks Directory

This directory contains custom React hooks that encapsulate the business logic of the MUME client.

## Key Hooks

- **`useTelnet.ts`**: Low-level networking and protocol handling.
- **`useCommandController.ts`**: High-level command logic and target substitution.
- **`useGmcpHandlers.ts`**: Handlers for GMCP data packets (Room Info, Vitals, etc.).
- **`useGameParser.ts`**: Parsers for raw text output from the game.
- **`useButtons.ts` / `useButtonPersistence.ts`**: Management and storage of custom buttons.
- **`useMapperController.ts`**: Logic for interacting with and updating the map.

## Guidelines

- **Logic Separation**: Each hook should have a single, clear responsibility.
- **Type Safety**: Avoid `any`. Use strict interfaces for data structures, especially GMCP.
- **Visual Chunking**: Use `// --- Section Name ---` separators to organize code within hooks.
