# The Button Editor

Customize your tactical interface by creating and editing action buttons.

## 🔧 Accessing the Editor
- **Long-Press**: Press and hold any existing button.
- **Design Mode**: Open the Set Manager and toggle "Design Mode" to move buttons freely.
- **Add New**: Click the `+` button while in Design Mode.

## 📝 Configuring Actions
Each button can have multiple interaction types:
- **Primary Click**: The main command sent when clicked.
- **Swipes**: Configure up to 4 swipe directions for additional commands (e.g., Up for 'Sheath', Down for 'Draw').
- **Long Press**: A secondary command for extended hold.

## 🔤 Variables
Use these variables in your commands:
- `%t` or `target`: Inserts your current target's name.
- `%n`: Inserts your character's name.

## 🔋 Triggers
Buttons can respond to game events:
- **On Combat**: Highlight or show the button only during combat.
- **On Communication**: Show the button when you receive a message.
- **Keyboard Hook**: Bind the button to a specific key on your physical keyboard.
