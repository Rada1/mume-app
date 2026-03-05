import zlib
import struct
import json
import os

def parse_mm2(filepath, floor_height=5.0):
    room_coords = {}
    if not os.path.exists(filepath):
        print(f"Error: File {filepath} not found.")
        return {}

    try:
        with open(filepath, 'rb') as f:
            data = f.read()

        # Check for zlib decompression header
        content = b""
        for offset in range(32):
            try:
                content = zlib.decompress(data[offset:])
                if len(content) > 10000:
                    break
            except:
                pass

        if not content:
             content = data

        i = 0
        limit = len(content) - 20
        while i < limit:
            # Look for: vnum, x, y, z, unknown_flag (usually 0)
            vnum, x, y, z, flags = struct.unpack('>iiiii', content[i:i+20])
            
            # Stricter constraints for valid MUME room data
            # 1. vnum must be > 0 and < 150000
            # 2. X and Y typically within -5000 to 10000 in MMapper
            # 3. Z typically -50 to 100
            # 4. Filter out common false positive patterns (like x=-1, y=-1 from empty strings/exits)
            # 5. The generic 'flags' byte following Z is almost always 0 in mm2
            
            if (0 < vnum < 150000 and 
                -5000 < x < 20000 and 
                -5000 < y < 20000 and 
                -100 < z < 100 and
                flags == 0):
                
                # Exclude purely repetitive noise
                if not (x == -1 and y == -1) and not (x == 0 and y == 0 and z == 0 and vnum < 1000):
                    if str(vnum) not in room_coords:
                        room_coords[str(vnum)] = (x * 0.1, y * 0.1, z * floor_height)
                        i += 19 # Skip ahead
            i += 1

        print(f"Parsed {len(room_coords)} rooms using strict binary heuristic.")
        
    except Exception as e:
        print(f"An error occurred while parsing: {e}")
        return {}

    return room_coords

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Parse MUME MMapper .mm2 files into 3D coordinates.")
    parser.add_argument("input", help="Path to the .mm2 file")
    parser.add_argument("-o", "--output", help="Path to save the JSON output (optional)")
    parser.add_argument("-f", "--floor", type=float, default=5.0, help="Floor height scaling (default: 5.0)")

    args = parser.parse_args()

    coords = parse_mm2(args.input, args.floor)

    if args.output and coords:
        # Convert tuples to lists for JSON serialization
        json_ready = {k: list(v) for k, v in coords.items()}
        with open(args.output, 'w') as f:
            json.dump(json_ready, f, indent=2)
        print(f"Saved {len(coords)} room coordinates to {args.output}")
