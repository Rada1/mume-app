import xml.etree.ElementTree as ET
import json
import os

def parse_xml_to_json(xml_file, output_file):
    print(f"Parsing {xml_file}...")
    
    # Use iterparse to handle large XML files without loading everything into RAM
    context = ET.iterparse(xml_file, events=('end',))
    
    rooms = {}
    
    dir_map = {
        'north': 'n',
        'south': 's',
        'east': 'e',
        'west': 'w',
        'up': 'u',
        'down': 'd',
        'northeast': 'ne',
        'northwest': 'nw',
        'southeast': 'se',
        'southwest': 'sw'
    }
    
    for event, elem in context:
        if elem.tag == 'room':
            vnum = elem.get('id')
            if not vnum:
                elem.clear()
                continue
                
            name = elem.get('title', 'Unknown Room')
            
            coord_elem = elem.find('coord')
            if coord_elem is not None:
                try:
                    x = int(coord_elem.get('x', 0))
                    y = int(coord_elem.get('y', 0))
                    z = int(coord_elem.get('z', 0))
                except ValueError:
                    x, y, z = 0, 0, 0
            else:
                x, y, z = 0, 0, 0
                
            exits = {}
            for exit_elem in elem.findall('exit'):
                d = exit_elem.get('direction')
                target = exit_elem.get('target')
                if d and target and d in dir_map:
                    exits[dir_map[d]] = int(target)
            
            # The mapper expects the array format we established earlier: [x, y, z] 
            # OR we can export the rich dictionary format {x, y, z, name, exits}
            # Let's export just [x, y, z] to match what useMapperController expects right now
            # wait, if the ghost dots just need coordinates, [x,y,z] is fine.
            # actually, since we are moving to better data, let's output [x, y, z] to perfectly fix the map first.
            rooms[vnum] = [x, y, z]
            
            elem.clear() # Free memory
            
    print(f"Parsed {len(rooms)} rooms.")
    
    with open(output_file, 'w') as f:
        json.dump(rooms, f)
        
    print(f"Saved to {output_file}")
    
    # Print a sample
    if '30070' in rooms:
        print(f"Room 30070 (Vig's Shop): {rooms['30070']}")
    if '1' in rooms:
        print(f"Room 1: {rooms['1']}")

if __name__ == "__main__":
    parse_xml_to_json('arda-base.xml', 'public/mume_map_data.json')
