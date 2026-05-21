import xml.etree.ElementTree as ET
import json
import os

def compile_ardagmcp():
    # Prioritise the Nazgum map if available
    xml_paths = ['data/ardanazgum.xml', 'public/ardagmcp.xml', 'data/ardagmcp.xml', 'ardagmcp.xml']
    xml_path = next((p for p in xml_paths if os.path.exists(p)), None)
    
    if not xml_path:
        print("Error: No map XML file found.")
        return
        
    output_path = 'public/mume_map_data.json'
    print(f"Loading map from {xml_path}...")
    
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
    except Exception as e:
        print(f"FATAL ERROR parsing XML: {e}")
        return

    rooms = {}
    floor_height = 1.0
    
    dir_map = {
        'north': 'n', 'south': 's', 'east': 'e', 'west': 'w',
        'up': 'u', 'down': 'd', 'northeast': 'ne', 'northwest': 'nw',
        'southeast': 'se', 'southwest': 'sw'
    }

    print("Iterating over rooms...")
    room_elems = root.findall('.//room')
    print(f"Found {len(room_elems)} room elements.")

    count = 0
    for elem in room_elems:
        room_id = elem.get('id')
        if not room_id:
            continue
        
        server_id = elem.get('server_id', room_id)
        name = elem.get('name', 'Unknown')
        
        x, y, z = 0, 0, 0
        coord = elem.find('coord')
        if coord is not None:
            try:
                x = int(float(coord.get('x', 0)))
                y = int(float(coord.get('y', 0)))
                z = int(float(coord.get('z', 0)))
            except: pass
        
        exits = {}
        for exit_elem in elem.findall('exit'):
            direction = exit_elem.get('dir') or exit_elem.get('direction')
            target = None
            to_node = exit_elem.find('to')
            if to_node is not None and to_node.text:
                target = to_node.text.strip()
            elif exit_elem.get('target'):
                target = exit_elem.get('target')
            
            # Extract nested exit and door flags
            exit_flags = [ef.text.strip() for ef in exit_elem.findall('exitflag') if ef.text]
            door_flags = [df.text.strip() for df in exit_elem.findall('doorflag') if df.text]
            
            door_attr = exit_elem.get('door')
            has_door = (door_attr == '1' or door_attr == 'true' or len(door_flags) > 0 or 'DOOR' in exit_flags)
            
            flags_attr = exit_elem.get('flags', '')
            if 'door' in flags_attr.lower() or 'closed' in flags_attr.lower():
                has_door = True
                
            combined_flags = sorted(list(set(exit_flags + door_flags)))
            
            if direction and target:
                d_key = direction.lower()
                if d_key in dir_map: d_key = dir_map[d_key]
                elif len(d_key) > 0: d_key = d_key[0]
                
                exits[d_key] = { 
                    "target": target, 
                    "hasDoor": has_door,
                    "flags": combined_flags
                }
        
        mob_flags = [f.text.strip() for f in elem.findall('mobflag') if f.text]
        load_flags = [f.text.strip() for f in elem.findall('loadflag') if f.text]

        area_elem = elem.find('area')
        area = area_elem.text.strip() if area_elem is not None and area_elem.text else ""

        terrain_elem = elem.find('terrain')
        terrain = terrain_elem.text.strip() if terrain_elem is not None and terrain_elem.text else "0"

        # Extract alignment, portable, ridable, light, sundeath, notes
        align_elem = elem.find('align')
        align = align_elem.text.strip() if align_elem is not None and align_elem.text else "NEUTRAL"

        portable_elem = elem.find('portable')
        portable = portable_elem.text.strip() if portable_elem is not None and portable_elem.text else "PORTABLE"

        ridable_elem = elem.find('ridable')
        ridable = ridable_elem.text.strip() if ridable_elem is not None and ridable_elem.text else "RIDABLE"

        light_elem = elem.find('light')
        light_text = light_elem.text.strip() if light_elem is not None and light_elem.text else "LIT"
        light_val = 1 if light_text == "DARK" else 0

        sundeath_elem = elem.find('sundeath')
        sundeath_text = sundeath_elem.text.strip() if sundeath_elem is not None and sundeath_elem.text else "SUNDEATH"
        sundeath_val = 0 if sundeath_text == "NO_SUNDEATH" else 1

        note_elem = elem.find('note')
        note = note_elem.text.strip() if note_elem is not None and note_elem.text else ""

        rooms[room_id] = [
            x, -y, z * floor_height,
            terrain, exits, name, server_id,
            mob_flags, load_flags, area,
            light_val, sundeath_val,
            align, portable, ridable, note
        ]        
        count += 1
        if count % 5000 == 0:
            print(f"Processed {count}...")

    print(f"Writing {len(rooms)} rooms to {output_path}...")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(rooms, f)
        
    print(f"Successfully compiled map data!")

if __name__ == "__main__":
    compile_ardagmcp()
