
import json

path = 'c:/Users/pwetz/Downloads/mume app/src/constants/mastersettings.json'
with open(path, 'r') as f:
    data = json.load(f)

changed = False
for btn in data.get('buttons', []):
    if btn.get('label') == 'Get' and btn.get('setId') == 'inline-object':
        print(f"Changing button {btn.get('id')} setId from inline-object to inline-obj-room")
        btn['setId'] = 'inline-obj-room'
        changed = True

if changed:
    with open(path, 'w') as f:
        json.dump(data, f)
    print("Saved changes.")
else:
    print("No matching buttons found.")
