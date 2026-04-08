# Mapper Directory (`src/components/Mapper/`)

## 🧠 Mental Model
The Mapper is the most complex UI component in the application. It renders an interactive 2D map of the MUD world using an HTML `<canvas>`. It requires extreme performance optimization because it updates rapidly during player movement.

## 🗂️ Architecture

### `Renderer/`
Contains the pure Web API Canvas 2D drawing logic. **This is not React.**
*   `renderer.ts`: The main drawing loop.
*   `drawEntities.ts`: Handles rendering players, NPCs, and items on the map.
*   **Rule:** Decouple `requestAnimationFrame` loops from React state. Use mutable `useRef`s passed from React to read state within the canvas loop.

### `Hooks/`
Contains the bridging logic between React state (from `GameContext`) and the Canvas renderer.
*   `useMapRender.ts`: Initializes the canvas and starts the render loop.
*   `useSmartWalk.ts`: Logic for pathfinding and auto-walking.

## ⚠️ AI Agent Guidelines
*   **Performance:** Avoid React state updates (`useState`) for continuous animations (like panning or moving). Mutate `refs` instead to prevent React tree reconciliation from stuttering the canvas.
*   **Constants:** The Arda map uses a strict `GRID_SIZE` constant of 50. Ensure any spatial calculations adhere to this scale.
