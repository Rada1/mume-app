"""
MMapper .mm2 uses Qt QDataStream (big endian by default).
The format is documented in mapper source: MmapperExport.h/.cpp

Qt QDataStream serialization for common types (all big endian):
- quint32: 4 bytes BE unsigned int
- qint32:  4 bytes BE signed int
- QString: 4 bytes length (FFFFFFFF = null, len is byte count), then UTF-16 BE chars
- quint8:  1 byte
- bool:    1 byte (0 or 1)

MMapper .mm2 file format (version 17+):
[Header]
  4b magic: 0xFFB2AF01
  4b version: uint32 
[Rooms - variable count until 0xFFFFFFFF sentinel]
  Each Room:
    4b vnum (quint32)
    4b x (qint32)
    4b y (qint32)  
    [Exits x10 - N,S,E,W,Up,Down,NE,NW,SE,SW]
      Each Exit:
        4b destination vnum (quint32, 0xFFFFFFFF = no exit)
        4b flags (quint32)
        4b door flags (quint32)
        [QString door name - 4b len (BE) then len bytes UTF-16BE]
    [QString name - 4b len then chars]
    [QString desc]
    [QString short desc]  
    [QString note]
    1b terrain type
    1b light
    1b align
    1b portable
    1b rideable
    1b updated
    4b z (qint32)
"""

import zlib, struct

def read_qstring(data, pos):
    """Read Qt QDataStream QString (4-byte BE length, then UTF-16BE)"""
    if pos + 4 > len(data):
        return None, pos
    length = struct.unpack('>I', data[pos:pos+4])[0]
    pos += 4
    if length == 0xFFFFFFFF:  # null string
        return '', pos
    if pos + length > len(data):
        return None, pos
    text = data[pos:pos+length].decode('utf-16-be', errors='replace')
    pos += length
    return text, pos

def parse_mm2_proper(filepath):
    with open(filepath, 'rb') as f:
        raw = f.read()

    # Header: 4 bytes magic, 4 bytes version, then zlib stream
    # The mm2 wrapper has some bytes before the zlib stream
    content = b""
    for offset in range(32):
        try:
            content = zlib.decompress(raw[offset:])
            if len(content) > 10000:
                print(f"Decompressed from offset {offset}: {len(content)} bytes")
                break
        except:
            pass

    # Read magic and version
    pos = 0
    magic = struct.unpack('>I', content[0:4])[0]
    version = struct.unpack('>I', content[4:8])[0]
    print(f"Magic: 0x{magic:08X}, Version: {version}")
    pos = 8

    rooms = {}
    exits_raw = {}  # vnum -> list of exit dest vnums
    
    room_count = 0
    while pos < len(content) - 4:
        # Read room vnum sentinel
        vnum = struct.unpack('>I', content[pos:pos+4])[0]
        pos += 4
        
        if vnum == 0xFFFFFFFF:  # End sentinel
            print(f"End sentinel at pos {pos-4}")
            break
        
        if vnum == 0 or vnum >= 150000:
            # Not a valid room, try to recover by skipping
            continue
        
        # Read position x, y
        if pos + 8 > len(content):
            break
        x, y = struct.unpack('>ii', content[pos:pos+8])
        pos += 8
        
        # Read 10 exits
        exits = {}
        exit_dirs = ['n','s','e','w','u','d','ne','nw','se','sw']
        for dir_name in exit_dirs:
            if pos + 12 > len(content):
                break
            dest_vnum = struct.unpack('>I', content[pos:pos+4])[0]
            exit_flags = struct.unpack('>I', content[pos+4:pos+8])[0]
            door_flags = struct.unpack('>I', content[pos+8:pos+12])[0]
            pos += 12
            # Read door name QString
            door_name, pos = read_qstring(content, pos)
            if door_name is None:
                break
            if dest_vnum != 0xFFFFFFFF and dest_vnum != 0:
                exits[dir_name] = dest_vnum

        # Read room strings
        name, pos = read_qstring(content, pos)
        if name is None: break
        desc, pos = read_qstring(content, pos)
        if desc is None: break
        short_desc, pos = read_qstring(content, pos)
        if short_desc is None: break
        note, pos = read_qstring(content, pos)
        if note is None: break
        
        # Read room flags (6 single bytes + 4b z)
        if pos + 10 > len(content):
            break
        terrain = content[pos]
        # light, align, portable, rideable, updated = content[pos+1:pos+6]
        pos += 6
        z = struct.unpack('>i', content[pos:pos+4])[0]
        pos += 4
        
        rooms[str(vnum)] = {
            'x': x,
            'y': y,
            'z': z,
            'name': name,
            'exits': exits
        }
        exits_raw[str(vnum)] = exits
        room_count += 1
        
        if room_count <= 5:
            print(f"  Room {vnum}: '{name}' at ({x},{y},{z}) exits: {list(exits.keys())}")
        elif room_count % 1000 == 0:
            print(f"  ...parsed {room_count} rooms, pos={pos}")

    print(f"\nTotal rooms parsed: {len(rooms)}")
    return rooms

rooms = parse_mm2_proper('arda.mm2')
