# Hooks Directory (`src/hooks/`)

## 🧠 Mental Model
The `hooks/` directory contains all of the application's **headless business logic**. If a component requires complex logic, networking, or parsing, that logic must be encapsulated here. Components should be "thin" and primarily responsible for rendering.

## 🗂️ Key Domains

### Core Game Loop
*   `useGameParser.ts`: The main text parsing engine for MUD output.
*   `useCommandController.ts`: Handles all outgoing user commands and interactions.
*   `useTelnet.ts`: Manages the WebSocket/Telnet connection to the server.

### Network Parsing (GMCP)
*   `useGmcpHandlers/`: Contains handlers for all Out-of-Band (GMCP) data.
    *   *Note:* This was refactored into sub-hooks (`useGmcpRoom`, `useGmcpVitals`, etc.) to adhere to the 300-Line Mandate. Always modify the specific sub-hook rather than a monolithic file.

### User Interface & Input
*   `useViewport.ts`: Manages screen dimensions, scroll states, and keyboard visibility.
*   `useButtons.ts` & `useJoystick.ts`: Logic for the dynamic on-screen controls.
*   `useMessageLog.ts`: Performance-critical hook for managing the virtualized text output buffer.

## ⚠️ AI Agent Guidelines
*   **Performance:** Hooks that update frequently (like `useMessageLog` or parsing hooks) should aggressively use `useRef` and `useCallback` to prevent unnecessary React re-renders.
*   **Separation of Concerns:** Do not put UI styling or JSX elements inside hooks. Return raw data or state toggle functions.
