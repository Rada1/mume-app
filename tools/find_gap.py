import zlib
import struct

def find_rooms():
    with open('arda.mm2', 'rb') as f:
        data = f.read()

    content = zlib.decompress(data[12:])
    
    # Let's find 30070
    pos1 = content.find(struct.pack('>i', 30070))
    if pos1 == -1: return
    
    # Find something else we know
    pos2 = content.find(struct.pack('>i', 30071)) # Try next vnum
    if pos2 == -1:
        # Just look for the next thing that looks like 4x big endian ints
        pos2 = pos1 + 16
        while pos2 < len(content):
            v, x, y, z = struct.unpack('>iiii', content[pos2:pos2+16])
            if 0 < v < 150000:
                print(f"Next potential room at {pos2}, vnum={v}")
                break
            pos2 += 1
            
    if pos1 != -1 and pos2 != -1:
        print(f"Room 1 at {pos1}, Room 2 at {pos2}. Gap: {pos2-pos1}")
        chunk = content[pos1:pos2]
        import binascii
        print("Hex Chunk:", binascii.hexlify(chunk).decode('ascii'))
        
find_rooms()
