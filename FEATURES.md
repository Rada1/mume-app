# MUME Client Features List

This document provides a comprehensive list of user-facing features available in the MUME (Middle-earth DREAMS) client application.

---

## 🗺️ Advanced Tolkien-esque Mapper
The client features a high-performance, hand-drawn aesthetic map system designed to enhance immersion in Middle-earth.
- **Dynamic Discovery**: Automatically maps rooms as you explore using GMCP data and intelligent prompt parsing.
- **Tolkien Aesthetic**: Uses custom hand-drawn assets for mountains, forests, hills, and parchment backgrounds.
- **Elevation Support**: Handles multiple Z-levels/floors (up/down movements).
- **Interactive Interaction**: Support for smooth panning, zooming (scroll wheel or pinch-to-zoom), and auto-centering on player location.
- **Edit Mode**: Manually adjust room positions, add custom notes, and manage the map layout.
- **Persistence**: Automatically saves map data to local storage, uniquely tracked per character name.
- **Export/Import**: Save and share your maps via JSON files.
- **Room Info HUD**: A detailed panel showing room name, terrain, description, zone, and personal notes.

## 🌤️ Immersive Environment System
The client translates game text into visual atmospheric effects.
- **Dynamic Weather**: Real-time visual effects for Rain, Heavy Rain, Snow, and Clouds.
- **Atmospheric Lighting**: Visual shifts based on lighting conditions (Sunlight, Moonlight, Artificial light, or Pitch Black).
- **Fog Effects**: Overlays a fog layer when thick fog is detected in-game.
- **Haptic Feedback**: Vibration alerts for mobile devices on combat hits or failed movement (e.g., "Alas, you cannot go that way").

## 🔊 Proactive Sound System
- **Custom Sound Triggers**: Upload your own audio files and set them to trigger on specific text patterns or Regular Expressions (Regex).
- **Audio Feedback**: Built-in sound support for various game events to improve situational awareness.

## 🔌 Robust Connection Options
- **Connection Modes**:
    - **Internal**: Standard direct connection.
    - **mMapper Proxy**: Connect through an mMapper bridge for enhanced mapping compatibility.
    - **mMapper Relay**: Connect directly to MUME while relaying data to an external mapper.
- **WebSocket Support**: Designed to work seamlessly with modern browsers using secure WebSocket (WSS) bridges.

## 📱 Mobile-First Optimization
- **Adaptive Layout**: UI elements shift and resize dynamically for phones and tablets.
- **Haptic Joystick**: A 4-directional joystick (North, South, East, West) with vibration feedback for tactile movement.
- **Intelligent Input Bar**: The command bar repositioning logic ensures it remains visible and usable even when the mobile keyboard is open.
- **Stat Bars**: High-visibility real-time bars for HP, Mana, and Movement.

## ⌨️ Customizable Control System
- **Dynamic Button Sets**: Create sets of custom buttons that can be toggled or switched automatically based on game state.
- **Spatially Triggered Buttons**: "Spat" buttons appear on-screen contextually (e.g., when a specific mob arrives) for quick reaction.
- **Stat-based Triggers**: Buttons and UI elements can change state based on your character's vitals.

## 📜 Intelligent Game Log
- **ANSI Color Support**: Full support for standard and enhanced MUD color codes.
- **Message Stacking**: Automatically collapses repetitive lines (like "A wolf arrives from the north") into a single entry with a counter (e.g., "Three wolves have arrived from the north") to reduce clutter.
- **Contextual Filtering**: Distinguishes between combat, communication, and world exploration text for improved readability.
- **Typewriter Aesthetic**: Optional retro-style text rendering for key UI elements.

## ⚙️ Settings & Customization
- **Custom Backgrounds**: Upload your own background image to personalize the client's look.
- **Layout Management**: Reset buttons and layouts to "Core Defaults", "User Defaults", or "Factory Settings".
- **Export/Import Settings**: Back up your entire configuration (buttons, triggers, URLs) to a JSON file.

---

*This list is updated as new features are added to the client. Last Updated: February 2026.*
