import xml.etree.ElementTree as ET
import json
import os

def compile_ardagmcp():
    xml_path = 'ardagmcp.xml'
    output_path = 'public/mume_map_data.json'
    
    if not os.path.exists(xml_path):
        print(f"Error: {xml_path} not found.")
        return

    print(f"Loading {xml_path} (full tree)...")
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
    # Find all room tags regardless of depth
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
            
            door_attr = exit_elem.get('door')
            has_door = (door_attr == '1' or door_attr == 'true')
            flags = exit_elem.get('flags', '')
            if 'door' in flags.lower() or 'closed' in flags.lower():
                has_door = True
            
            if direction and target:
                d_key = direction.lower()
                if d_key in dir_map: d_key = dir_map[d_key]
                elif len(d_key) > 0: d_key = d_key[0]
                
                exits[d_key] = { "target": target, "hasDoor": has_door }
        
        mob_flags = [f.text.strip() for f in elem.findall('mobflag') if f.text]
        load_flags = [f.text.strip() for f in elem.findall('loadflag') if f.text]
        
        terrain_elem = elem.find('terrain')
        terrain = terrain_elem.text.strip() if terrain_elem is not None and terrain_elem.text else "0"

        rooms[room_id] = [
            x, -y, z * floor_height, 
            terrain, exits, name, server_id,
            mob_flags, load_flags
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
