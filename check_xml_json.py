import json
with open('public/mume_map_data.json', 'r') as f:
    d = json.load(f)
print(f"Total rooms: {len(d)}")
print(f"Vigs shop (30070): {d.get('30070')}")
sample = list(d.items())[:5]
print(f"Sample: {sample}")
