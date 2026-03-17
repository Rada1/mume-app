# The Button Editor

Customize your tactical interface by creating and editing action buttons.

## 🔧 Accessing the Editor
- **Design Mode**: Open the main menu and select "Enter Design Mode". In this mode, UI elements will shimmer to indicate they are editable.
- **Editing Buttons**: While in Design Mode, tap any button to open its configuration modal.
- **Adding Buttons**: Click the **Plus (+)** floating button in Design Mode to create a new button.

## 📝 Configuring Actions
- **Primary Click**: The main command sent when the button is tapped.
- **Swipe Actions**: Configure up to 4 swipe directions (North, South, East, West). Each direction can have its own command, icon, and label.
- **Short vs Long Swipe**: Buttons support "Double Swipes" for even deeper command nesting.
- **Auto-Submit**: Toggle this off if you want the button to pre-fill the command bar without sending, allowing you to append more text.

## ✨ Advanced Features
- **Swipe Wheels**: Hold a button to see its "Swipe Wheel" — a visual guide to all configured swipe actions.
- **Dynamic Variable (%t)**: Use `%t` in your commands to automatically insert your current target's name.
- **State Triggers**: Set buttons to only appear when in specific states, such as "Combat Only".

## 🔋 Logic & Networking
- **Silent Commands**: Toggle "Silent" to send commands without echoing them in the message log (useful for status checks).
- **Haptic Feedback**: Each button and swipe can have custom haptic patterns for physical confirmation.
