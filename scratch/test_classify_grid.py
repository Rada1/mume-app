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

def classify_color(r, g, b):
    r, g, b = float(r), float(g), float(b)
    
    # 1. Water
    if r < 60 and g > 90 and b > 90 and abs(g - b) < 30:
        return "Water"
        
    # 2. Shallows
    if g > 170 and b > 170 and g > r and b > r:
        return "Shallows"
        
    # 3. Forest
    if g > 80 and g > r * 1.3 and g > b * 1.4:
        return "Forest"
        
    # 4. Mountains
    if r > g and g > b and r < 160:
        return "Mountains"
        
    # 5. Hills
    max_val = max(r, g, b)
    min_val = min(r, g, b)
    chroma = max_val - min_val
    if chroma < 15 and max_val < 200:
        return "Hills"
        
    # 6. Field
    if g > 140 and r > 130 and g > b * 1.15:
        return "Field"
        
    return None

print("Scanning grid coordinates and classifying:")
for ry in range(-120, 20, 15):
    row_str = f"RY={ry:4d} | "
    for rx in range(20, 320, 30):
        wx = rx * GRID_SIZE + GRID_SIZE / 2
        wy = ry * GRID_SIZE + GRID_SIZE / 2
        px = int((wx - bgTranslateX) / bgScale)
        py = int((wy - bgTranslateY) / bgScale)
        if 0 <= px < width and 0 <= py < height:
            r, g, b = img.getpixel((px, py))
            terrain = classify_color(r, g, b)
            t_short = terrain[0] if terrain else "."
            row_str += f"{rx:3d}:{t_short} "
        else:
            row_str += f"{rx:3d}:? "
    print(row_str)
