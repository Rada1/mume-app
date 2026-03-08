# The Button Editor

Customize your tactical interface by creating and editing action buttons.

## 🔧 Accessing the Editor
- **Long-Press**: Press and hold any existing button to open its configuration.
- **Design Mode**: Use the toolbar to toggle "Design Mode" and move buttons freely.

## 📝 Configuring Actions
- **Primary Click**: The main command sent when clicked.
- **Swipes**: Configure up to 4 swipe directions for additional commands on the same button.
- **Auto-Fill**: Toggle "Auto-Submit" off if you want a button to pre-fill the command bar without sending immediately.

## ✨ Adaptive Content
Buttons can be made "Dynamic" by linking them to game events:
- **Communication Captures**: If a button is set to capture "Tells", it will automatically update its label to the name of the last person who sent you a message. 
- **Variable Substitution**: Use `%t` for your target, or use capture groups from Regex triggers to dynamically insert names into your commands.

## 🔋 UI States
- **Visibility**: Set buttons to only appear during specific states (Combat, Hidden, or Communication).
- **Keyboard Hook**: Bind buttons to physical keys for a traditional desktop experience.
