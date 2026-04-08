# Context Directory (`src/context/`)

## 🧠 Mental Model
The `context/` directory manages the global state of the application. It acts as the central data store that connects the headless logic (`src/hooks/`) with the UI components (`src/components/`).

## 🗂️ The Context Split
To prevent massive application-wide re-renders during high-frequency events (like text scrolling or combat), the global state is explicitly split into separate Context Providers:

1.  **`GameContext`**: The core source of truth. Handles low-frequency state (Theme, Settings, Network Status, Room Name).
2.  **`VitalsContext`**: Handles medium-to-high frequency combat data (HP, Mana, Target, Opponent Status).
3.  **`LogContext`**: Handles high-frequency text output (Messages array, Highlighting state).
4.  **`UIContext`**: Handles visual drawer states (Inventory open/closed, Popovers).

## ⚠️ AI Agent Guidelines
*   **Avoid God Files:** The main `GameContext.tsx` acts as an orchestrator. Do not dump raw state `useState` declarations into it. State should be managed in `GameContext/state.ts`.
*   **Targeted Hooks:** When a component needs data, use the specific hook (e.g., `useVitals()`) rather than `useGame()` to minimize re-renders.
*   **Zero-Any:** Ensure all state shapes are strictly defined in `GameContext/types.ts`.
