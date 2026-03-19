import json
import os

filepath = r'c:\Users\pwetz\Downloads\mume app\src\constants\mastersettings.json'
with open(filepath, 'r', encoding='utf-8') as f:
    data = json.load(f)

modified = False
for b in data.get('buttons', []):
    if b.get('id') in ['trig-hungry', 'trig-thirsty']:
        print(f"Disabling {b.get('id')}")
        b['trigger']['enabled'] = False
        modified = True

if modified:
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, separators=(',', ':'))
    print('Successfully updated mastersettings.json')
else:
    print('No changes needed')
