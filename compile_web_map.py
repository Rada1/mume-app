import os
import json
import glob

def compile_web_map(output_file):
    print("Compiling MMapper Web Map into mume_map_data.json...")
    search_path = os.path.join('ardawebmap', 'v1', 'zone', '*.json')
    zone_files = glob.glob(search_path)
    
    room_coords = {}
    
    for file_path in zone_files:
        with open(file_path, 'r', encoding='utf-8') as f:
            try:
                rooms = json.load(f)
                for room in rooms:
                    vnum = str(room.get('id'))
                    if vnum:
                        x = int(room.get('x', 0))
                        y = int(room.get('y', 0))
                        z = int(room.get('z', 0))
                        name = room.get('name', '')
                        
                        terrain = room.get('sector', 0)
                        exits_data = room.get('exits', [])
                        
                        exit_targets = {}
                        dirs = ['n', 'e', 's', 'w', 'u', 'd', 'ne', 'nw', 'se', 'sw']
                        for i, ext in enumerate(exits_data):
                            if i < len(dirs) and ext.get('out'):
                                exit_targets[dirs[i]] = str(ext['out'][0])
                        
                        # Store name for fingerprinting
                        room_coords[vnum] = [x, y, z, terrain, exit_targets, name]
            except Exception as e:
                import traceback
                traceback.print_exc()
                print(f"Error parsing {file_path}: {e}")
                
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(room_coords, f)
        
    print(f"Successfully compiled {len(room_coords)} rooms to {output_file}!")

if __name__ == "__main__":
    compile_web_map('public/mume_map_data.json')
