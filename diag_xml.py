import xml.etree.ElementTree as ET
import sys

def diag_xml():
    xml_path = 'ardagmcp.xml'
    context = ET.iterparse(xml_path, events=('end',))
    
    room_count = 0
    no_id_count = 0
    id_map = {}
    
    for event, elem in context:
        if elem.tag == 'room':
            room_count += 1
            room_id = elem.get('id')
            if not room_id:
                no_id_count += 1
            else:
                id_map[room_id] = id_map.get(room_id, 0) + 1
            elem.clear()
            
            if room_count % 5000 == 0:
                print(f"Read {room_count} rooms...")

    print(f"Total <room> tags: {room_count}")
    print(f"Rooms with no 'id' attr: {no_id_count}")
    print(f"Unique IDs: {len(id_map)}")

if __name__ == "__main__":
    diag_xml()
