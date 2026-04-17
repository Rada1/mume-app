import json
import re

# Simplified version of the STATIC_MUSIC_MAP keys
mapped_zones = [
    'bree', 'bree-land', 'the bree-land',
    'old east road', 'the old east road',
    'shire', 'the shire',
    'blue mountains', 'the blue mountains',
    'old forest', 'the old forest',
    'rivendell',
    'grey havens', 'the grey havens',
    'north anduin', 'the northern anduin vale',
    'road to tharbad', 'the road to tharbad',
    'road to fornost', 'the road to fornost',
    'fornost', "deadmen's dike", "the deadmen's dike",
    'lhun valley', 'the lhun valley',
    'ancient broken road', 'the ancient broken road',
    'barrow-downs', 'the barrow-downs',
    'dunland',
    'emyn-nu-fuin',
    'eregion',
    'ettenmoors', 'the ettenmoors',
    'gladden fields', 'the gladden fields',
    'goblin-town', 'the goblin-town',
    'lorien', 'the lorien surroundings',
    'midgewaters', 'the midgewaters',
    'moria', 'the moria',
    'misty mountains', 'the misty mountains',
    'ost-in-edhil',
    'road to grey havens', 'the road to grey havens',
    'rohan',
    'tharbad',
    'trollshaws', 'the trollshaws',
    'troll warrens', 'the troll warrens',
    'weathertop', 'the weathertop',
    'valinor', 'the valinor'
]

with open('public/mume_map_data.json', 'r') as f:
    data = json.load(f)

map_zones = set()
for room_id, room_data in data.items():
    if isinstance(room_data, list) and len(room_data) > 9:
        zone = room_data[9]
        if zone:
            map_zones.add(zone.strip().lower())

unmapped = []
for mz in sorted(list(map_zones)):
    if mz not in mapped_zones:
        unmapped.append(mz)

print(json.dumps(unmapped))
