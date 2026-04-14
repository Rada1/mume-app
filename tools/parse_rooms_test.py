import sys, zlib, struct, io

filepath = r'c:\Users\pwetz\Downloads\mume app\arda.mm2'

with open(filepath, 'rb') as f:
    data = f.read()

decompressed = zlib.decompress(data[12:])
s = io.BytesIO(decompressed)

def ru32(): return struct.unpack('>I', s.read(4))[0]
def ri32(): return struct.unpack('>i', s.read(4))[0]
def ru8(): return struct.unpack('B', s.read(1))[0]
def ru16(): return struct.unpack('>H', s.read(2))[0]
def rstr():
    n_bytes = s.read(4)
    if len(n_bytes) < 4: raise EOFError("EOF reading string len")
    n = struct.unpack('>I', n_bytes)[0]
    if n in (0xFFFFFFFF, 0): return ''
    return s.read(n).decode('utf-16-be', errors='replace')

room_count = ru32()
mark_count = ru32()
curr_x = ri32()
curr_y = ri32()
curr_z = ri32()

print(f"Rooms: {room_count}, Marks: {mark_count}, Current Pos: {curr_x},{curr_y},{curr_z}")

valid_rooms = 0
for i in range(100):
    try:
        name = rstr()
        desc = rstr()
        contents = rstr()
        iid = ru32()
        note = rstr()
        
        terrain = ru8()
        light = ru8()
        align = ru8()
        portable = ru8()
        ridable = ru8()
        sundeath = ru8()
        
        mob_flags = ru32()
        load_flags = ru32()
        up_to_date = ru8()
        
        x = ri32()
        y = ri32()
        z = ri32()
        
        for e in range(7):
            exit_flags = ru16()
            door_flags = ru16()
            door_name = rstr()
            while True:
                val = struct.unpack('>I', s.read(4))[0]
                if val == 0xFFFFFFFF: break
            while True:
                val = struct.unpack('>I', s.read(4))[0]
                if val == 0xFFFFFFFF: break
                
        valid_rooms += 1
        if i < 5:
            print(f"Room {i}: id={iid} '{name[:20]}' ({x},{y},{z})")
    except Exception as e:
        print(f"Failed at room {i}: {e}")
        break

print(f"Validated {valid_rooms}/{room_count} rooms so far")
