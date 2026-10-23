# Client macros and customizable keybindings

Requested: October 23, 2026. Status: client macros and macro keybindings implemented in Settings → Actions/Macros. Dedicated built-in action rebinding and mount/lead presets remain future work.

## User goal

Let players customize numpad hotkeys and keyboard shortcuts generally, with a macros/keybindings settings experience inspired by the user's MUME Cockpit workflow.

## Requested capabilities

- Bind mount and lead actions to numpad keys.
- Bind directional open and unlock actions to modified numpad directions, such as Ctrl or Shift plus a direction. Exact default combinations are undecided.
- Customize ordinary keyboard keys as well as numpad keys, including modifier combinations.
- Save bindings and let players edit, remove, and restore defaults through a discoverable settings screen.
- Support named macros containing multiple commands, for example `hit orc; examine orc`, and bind those macros to keyboard shortcuts.

## Macro interface

Settings and command-bar definitions use the same persistent client macro store, saved on the current browser. Existing automatic text actions remain alongside the Client Macros section.

- Settings: macro name, a command editor, and an optional keybinding. Show one command per line, with semicolon-separated input also accepted.
- Command bar: for example, `/alias orc hit orc; examine orc` creates or updates a client macro named `orc`.
- Invocation: typing `orc` or `/orc` runs the saved chain when the entire command line is that macro name.
- `/unalias orc` removes the client macro; `/macros` opens Actions/Macros settings.
- Execute chain steps in their saved order through the shared command flow.
- Treat `/alias` as a local client command. Parse its entire definition before splitting the macro body, so defining a chain never executes its commands.
- Commands send in order without waiting for responses. Semicolons and newlines separate steps; quoting/escaping literal semicolons and response waits remain future work.
- Keybindings record physical key codes with Ctrl/Alt/Shift/Meta modifiers, preserving numpad identity with Num Lock on or off. Duplicate macro bindings are rejected, and assigned numpad keys take precedence over defaults.
- Macro expansion resolves nested named macros before sending, rejecting cycles and chains exceeding 100 commands.

## Implementation

`useClientMacroStore.ts` owns persistence. `useClientMacroCommands.ts` intercepts definitions and invocations in `useCommandController.ts` before normal command handling. `useClientMacroHotkeys.ts` registers before the existing numpad/F-key handlers and uses the same execution route. `useClientMacroEditor.ts` owns settings drafts and key recording; `ClientMacroSettings.tsx` is the settings view.

## Implementation considerations

- Start from `src/hooks/useNumpadControls.ts`, currently called by `src/hooks/useCommandController.ts`.
- Preserve existing movement, Look, and Alt+numpad door behavior as defaults unless deliberately reassigned.
- Recognize physical numpad keys with Num Lock both on and off.
- Define how mount/lead targets are chosen before assigning defaults.
- Surface binding conflicts and preserve normal typing in text fields and settings inputs.
- Route bound actions through the existing command execution flow. Keep binding resolution and persistence in hooks/stores, with thin settings components.
- Multi-command macro chains are required; keep command-bar definitions, settings edits, and keybindings backed by the same macro records.
