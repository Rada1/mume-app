
import json

with open('c:/Users/pwetz/Downloads/mume app/src/constants/mastersettings.json', 'r') as f:
    data = json.load(f)

buttons = data.get('buttons', [])
for btn in buttons:
    if btn.get('label') == 'Get' or 'get' in btn.get('command', '').lower():
        print(json.dumps(btn, indent=2))
