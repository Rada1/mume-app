# Components Directory

This directory contains the React components for the MUME client UI.

## Structure

- **`/Layout`**: Main layout layers (Atmospheric, HUD, Modals, MainContent).
- **`/Mapper`**: Components specifically for the game map and его rendering.
- **`/Popovers`**: Floating menus and context-sensitive overlays.
- **`/Drawers`**: Side drawers for character info, inventory, and equipment.
- **`/ButtonEditor`**: Sub-components for the custom button editing interface.

## Guidelines

- **Thin Components**: Components should primarily handle rendering and user interactions. Business logic should be extracted into hooks.
- **Styling**: Use global CSS classes or inline styles for dynamic positioning.
- **Agent-Friendliness**: Keep component files under 300 lines. Use sub-components for complex UIs.
