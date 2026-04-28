# Game Parser Hooks

This directory contains specialized hooks for parsing game output from MUME. It follows the 300-line mandate by decomposing the large `useGameParser` hook into focused, single-responsibility modules.

## Architecture

- **`useGameParser.ts`**: The orchestrator hook. It coordinates all sub-parsers and maintains the public API used by `GameContext`.
- **`useCaptureParser.ts`**: Owns the reactive capture machine for inventory, equipment, stats, score, quests, and other drawer data.
- **`usePromptParser.ts`**: Specifically handles MUME prompt detection and health status extraction.
- **`useCombatParser.ts`**: Detects combat verbs, side determination, and experience tickers.
- **`useStatParser.ts`**: Extracts OB/DB/Armour/Mood and detailed score data.
- **`useRoomParser.ts`**: Detects room names, dark status, and triggers mapper movement events.
- **`useAtmosphereParser.ts`**: Handles weather (rain, snow), fog, and lightning effects.
- **`useActionTracker.ts`**: Tracks item movements (wear, remove, get, drop) to update local state optimistically.
- **`useCommParser.ts`**: Parses communication channels (says, tells), GMCP comms, and multi-line continuations.
- **`useMessageRouter.ts`**: Determines message visibility and routes specific list types (WHO, WHERE).
- **`useLogGmcpParser.ts`**: Extracts embedded GMCP/log metadata before final tokenization.

## Flow

1.  `useGameParser` receives a raw line from the server.
2.  It delegates specific parts of the line analysis to sub-hooks.
3.  The sub-hooks either update state directly (via passed setters) or return metadata back to the orchestrator.
4.  The orchestrator performs final message routing and capture finalization.
