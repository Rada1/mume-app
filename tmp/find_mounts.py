import json
filepath = r'c:\Users\pwetz\Downloads\mume app\src\constants\mastersettings.json'
with open(filepath, 'r', encoding='utf-8') as f:
    data = json.load(f)

for b in data.get('buttons', []):
    if b.get('setId') == 'inline-mounts':
        print(json.dumps(b, indent=2))
