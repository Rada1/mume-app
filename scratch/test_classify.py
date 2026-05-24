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
    # Convert to float for safety
    r, g, b = float(r), float(g), float(b)
    
    # 1. Parchment Background (Empty Map/No Terrain)
    # Background is typically beige/parchment: high R and G, moderate B, low saturation
    # e.g., R=224, G=208, B=144 or R=240, G=240, B=240
    # Let's check saturation
    max_val = max(r, g, b)
    min_val = min(r, g, b)
    chroma = max_val - min_val
    
    # If it's very bright and near-grayscale or beige:
    if r > 210 and g > 200 and b > 160 and chroma < 40:
        return None # Empty/Background
    if r > 230 and g > 230 and b > 220:
        return None # Very bright background
        
    # 2. Water (Steel Blue / Deep Teal Blue)
    # e.g., RGB: (16, 128, 128) -> teal/blue
    # Water has low red, moderate-to-high blue and green.
    if b > 80 and g > 80 and r < b * 0.6 and r < g * 0.6:
        # Check if it is light blue (Shallows) or blue (Water)
        # Shallows is very light: e.g. R=208, G=240, B=224 (G and B are very high, R is also relatively high)
        if g > 180 and b > 180:
            return "Shallows"
        return "Water"

    # 3. Forest (Strong Green / Dark Green)
    # e.g. RGB: (32, 128, 16) or (80, 160, 48)
    # G is dominant, and significantly higher than R and B.
    if g > r * 1.25 and g > b * 1.5:
        # If it's very dark green
        if g < 110:
            return "Forest"
        # If it's lighter green (e.g. Field is also green, but it has high R)
        # Let's check R: Field is #d0e080 (208, 224, 128) - R is very high
        # Forest has R < 120 or R < G * 0.6
        if r < g * 0.65:
            return "Forest"
            
    # 4. Field (Grasslands / Light Green)
    # e.g., RGB: (208, 224, 128) -> G > R > B, high R and G
    if g > 160 and r > 150 and g > b * 1.3:
        return "Field"
        
    # 5. Mountain (Dark Brown / Earthy)
    # e.g., RGB: (144, 112, 80) or (96, 80, 48)
    # R > G > B, moderate saturation, relatively dark
    if r > g and g > b and r < 180:
        # Check if it's mountain (dark brown/grayish brown) vs hills (light brown/grey)
        if r - b > 20 and g - b > 10:
            # Brownish
            if r < 130:
                return "Mountains"
            return "Hills"
            
    # 6. Hills (Light Brown / Greyish Brown / Grey)
    # e.g. RGB: (192, 192, 144) or general grays
    if chroma < 25 and max_val < 200 and max_val > 90:
        return "Hills"
        
    return None

# Let's sample a few points and print their classification
print("Sampling grid points around Hobbiton/Bree area:")
# Let's map Hobbiton: 156, -68
# Let's map Bree: 227, -97
# Let's map Mithlond: 60, -76
# Let's map Rivendell: 393, 1
test_coords = [
    ("Mithlond (Water/Port)", 60, -76),
    ("Hobbiton (Field/Grass)", 156, -68),
    ("Bree (Hills/Fields)", 227, -97),
    ("Rivendell (Mountain/Hills)", 393, 1),
    ("Old Forest (Forest)", 190, -90),
    ("Blue Mountains (Mountains)", 70, -100),
    ("Grey Havens Sea (Water)", 20, -100),
]

for name, rx, ry in test_coords:
    wx = rx * GRID_SIZE + GRID_SIZE / 2
    wy = ry * GRID_SIZE + GRID_SIZE / 2
    px = int((wx - bgTranslateX) / bgScale)
    py = int((wy - bgTranslateY) / bgScale)
    
    if 0 <= px < width and 0 <= py < height:
        r, g, b = img.getpixel((px, py))
        terrain = classify_color(r, g, b)
        print(f"{name:30s} | Cell: {rx:3d},{ry:3d} | Pixel: {px:4d},{py:4d} | RGB: ({r:3d},{g:3d},{b:3d}) | Classified: {terrain}")
    else:
        print(f"{name:30s} | Cell: {rx:3d},{ry:3d} | Out of bounds ({px},{py})")
