import json

def check_z():
    with open('public/mume_map_data.json', 'r') as f:
        data = json.load(f)
    
    z_counts = {}
    for vnum in data:
        z = data[vnum][2]
        z_counts[z] = z_counts.get(z, 0) + 1
    
    print("Z-level distribution:")
    for z in sorted(z_counts.keys()):
        print(f"Z={z}: {z_counts[z]} rooms")

if __name__ == "__main__":
    check_z()
