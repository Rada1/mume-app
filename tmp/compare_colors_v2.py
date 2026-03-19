import json
filepath = r'c:\Users\pwetz\Downloads\mume app\src\constants\mastersettings.json'
with open(filepath, 'r', encoding='utf-8') as f:
    data = json.load(f)

output_path = r'c:\Users\pwetz\Downloads\mume app\tmp\colors_output.txt'
with open(output_path, 'w', encoding='utf-8') as f:
    sets = ['inline-mounts', 'inlinenpc']
    for s in sets:
        f.write(f"--- {s} ---\n")
        for b in data.get('buttons', []):
            if b.get('setId') == s:
                 f.write(f"ID: {b.get('id')}, Label: {b.get('label')}, Color: {b.get('style', {}).get('backgroundColor')}\n")
