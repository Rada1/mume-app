import json

with open('public/mume_map_data.json', 'r') as f:
    data = json.load(f)

zones = set()
for room_id, room_data in data.items():
    if isinstance(room_data, list) and len(room_data) > 9:
        zone = room_data[9]
        if zone:
            zones.add(zone.strip().lower())

print(json.dumps(sorted(list(zones))))
