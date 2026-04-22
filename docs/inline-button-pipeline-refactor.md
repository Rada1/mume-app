# Inline Button Pipeline Refactor Specification

## Objective
Refactor the current fragile, React-coupled HTML string manipulation pipeline for identifying and rendering inline buttons (entities like players, NPCs, items) in game messages. The goal is to transition to a robust, synchronous, pure-TypeScript tokenized Abstract Syntax Tree (AST) pipeline that operates independently of the React render cycle.

## Core Issues to Address
1. **HTML String Manipulation:** `safeHighlight` injects `<span>` tags into raw HTML strings using regular expressions, causing DOM breakages and formatting bugs.
2. **React Lifecycle Coupling:** `useMessageHighlighter` relies on React state (`currentOccupants`, `roomNpcs`), causing massive performance overhead and making debugging difficult.
3. **Asynchronous Race Conditions:** Text logs often hit the parser before GMCP data updates the state, resulting in missed highlights.
4. **Split Sources of Truth:** Logic for entity categorization and prioritization is split between `useEntityRegistry` and `useMessageHighlighter`.

## Proposed Architecture

### 1. Tokenized AST Pipeline (No Regex HTML Injection)
Instead of manipulating raw HTML strings, convert incoming text lines into an array of structural tokens before rendering.

**Data Structure Example:**
```typescript
type TokenType = 'text' | 'entity' | 'formatting';

interface BaseToken {
  type: TokenType;
  content: string;
}

interface TextToken extends BaseToken {
  type: 'text';
}

interface EntityToken extends BaseToken {
  type: 'entity';
  entityId: string;
  entityKind: string;
  action: string;
  color?: string;
  // Other relevant data for rendering an inline button
}

interface FormattingToken extends BaseToken {
  type: 'formatting';
  htmlTag: string; // e.g., 'span', 'b'
  attributes?: Record<string, string>;
  children: Token[];
}

type Token = TextToken | EntityToken | FormattingToken;
```

### 2. Pure TypeScript Parser Service
Extract the parsing logic out of React components and hooks (`useMessageHighlighter.ts`).
- Create a pure TypeScript function/service (e.g., `parseGameLine(rawText: string, currentGameState: GameStateStore): Token[]`).
- This service takes the raw text and the current known GMCP state, and returns the Token array.
- This allows for easy unit testing without React dependencies.

### 3. Unified Event Ingestion Queue (Synchronize Streams)
Resolve race conditions between GMCP data and text logs.
- Implement an event queue at the Telnet/Network layer (`useTelnet.ts` / `GmcpDecoder`).
- Process GMCP packets immediately to update the central state (Zustand stores in `src/stores/`).
- Hold incoming text lines briefly (e.g., until the end of the current network chunk) to ensure GMCP state is updated before parsing the text line against the state.

### 4. Single Source of Truth for Entity Logic
Consolidate entity logic into the central store or registry (`useEntityRegistry.ts` / Zustand store).
- The highlighter/parser should be "dumb". It should not determine what an entity is or its priority.
- The `EntityRegistry` (or store) should expose a method like `findEntitiesInText(rawText: string)`.
- This method matches the text against known room entities and returns the specific Entity IDs and metadata to the parser.

### 5. React Render Layer
- Update the React message rendering components (e.g., `MessageLog`) to accept and render the `Token[]` array.
- Map over the tokens:
  - If `type === 'entity'`, render the `<InlineButton>` or `renderInlineSpan` equivalent component/HTML safely.
  - If `type === 'text'`, render a standard text node or `<span>`.
  - If `type === 'formatting'`, render the appropriate HTML tag wrapping its children.

## Implementation Steps
1. **Define Token Interfaces:** Create the TypeScript interfaces for the AST tokens in `src/types/`.
2. **Create Parser Service:** Implement the `parseGameLine` function and `findEntitiesInText` logic in a new pure TS service.
3. **Update Ingestion Queue:** Modify the network layer to synchronize GMCP and text processing.
4. **Refactor Entity Registry:** Ensure the registry or store acts as the sole source of truth for entity capabilities and matching.
5. **Update UI Components:** Refactor `MessageLog` and related components to render AST tokens instead of using `dangerouslySetInnerHTML` with regex-injected strings.
6. **Write Unit Tests:** Add comprehensive unit tests for the pure `parseGameLine` and `findEntitiesInText` functions.
7. **Cleanup:** Remove `useMessageHighlighter.ts` and associated regex-based string manipulation utilities.
