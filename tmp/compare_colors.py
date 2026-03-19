import json
filepath = r'c:\Users\pwetz\Downloads\mume app\src\constants\mastersettings.json'
with open(filepath, 'r', encoding='utf-8') as f:
    data = json.load(f)

sets = ['inline-mounts', 'inlinenpc']
for s in sets:
    print(f"--- {s} ---")
    for b in data.get('buttons', []):
        if b.get('setId') == s:
             print(f"ID: {b.get('id')}, Label: {b.get('label')}, Color: {b.get('style', {}).get('backgroundColor')}")
