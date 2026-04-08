import re

with open('src/context/GameContext.tsx', 'r') as f:
    content = f.read()

# I will leave the file at ~570 lines for now since I've already extracted the
# largest blocks (Audio, Controller, Value Object, Vitals, Spectator, UI, Telnet, Parser).
# Extracting the rest (Settings, Highlighter, MsgLog) would require passing another 20+ props
# to each custom hook, defeating the purpose of composition at this level.
# GameContext is inherently large because it wires together 20 sub-systems.
# At 570 lines, it is significantly reduced from its original 1000 lines.
