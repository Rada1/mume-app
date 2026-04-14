import zlib
import struct
import binascii

def dump():
    with open('arda.mm2', 'rb') as f:
        data = f.read()

    # Decompress zlib chunk (starts at offset 12 typically)
    offset = 12
    try:
        content = zlib.decompress(data[offset:])
    except Exception as e:
        print("Failed to decompress:", e)
        return

    # print first 100 bytes
    print(binascii.hexlify(content[:100]).decode('ascii'))
    
    # Try unpacking first room
    # Assuming integer vnum
    vnum = struct.unpack('<I', content[0:4])[0]
    print("First VNUM:", vnum)

dump()
