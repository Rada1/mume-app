import os
from PIL import Image

img_path = r"c:\Users\pwetz\Downloads\mume app\public\assets\Pictures\middle_earth.png"
if not os.path.exists(img_path):
    print("Image not found")
    exit(1)

img = Image.open(img_path).convert("RGB")
width, height = img.size

bgScale = 7.2532
bgTranslateX = -4824
bgTranslateY = -9044
GRID_SIZE = 50

# Let's scan a grid of coordinates and find what colors they have.
# We'll scan from rx = 20 to 300, ry = -120 to 10
print("Scanning grid coordinates:")
for ry in range(-120, 20, 15):
    row_str = f"RY={ry:4d} | "
    for rx in range(20, 320, 30):
        wx = rx * GRID_SIZE + GRID_SIZE / 2
        wy = ry * GRID_SIZE + GRID_SIZE / 2
        px = int((wx - bgTranslateX) / bgScale)
        py = int((wy - bgTranslateY) / bgScale)
        if 0 <= px < width and 0 <= py < height:
            r, g, b = img.getpixel((px, py))
            # Format color as a simple shorthand
            hex_color = f"{r:02x}{g:02x}{b:02x}"
            row_str += f"{rx:3d}:({hex_color}) "
        else:
            row_str += f"{rx:3d}:(out) "
    print(row_str)
