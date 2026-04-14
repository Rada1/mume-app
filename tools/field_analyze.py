"""
After the name and desc, there are more fields.
Let's see what follows after room 30070's description.
Next 40 bytes: 000000be0041000000000000000000000000000000000000000000000000000000000000000000000000
That's 190 (0xBE) followed by 65 (0x41='A') then a lot of zeros.
0x000000BE = 190  <- looks like a Qt QString length (190 bytes = 95 UTF-16 chars, a long room desc?)
Wait, 0x000000BE is a uint32 = 190 bytes for the next string.
So the sequence is: after name+desc, there are more QString fields (short_desc, note?) and then some byte flags.
Let's read them all.
"""

import zlib, struct, binascii

def read_qstring_be(data, pos):
    if pos + 4 > len(data):
        return None, pos
    length = struct.unpack('>I', data[pos:pos+4])[0]
    pos += 4
    if length == 0xFFFFFFFF:
        return '', pos
    if length > 200000 or pos + length > len(data):
        return None, pos
    text = data[pos:pos+length].decode('utf-16be', errors='replace')
    pos += length
    return text, pos

with open('arda.mm2', 'rb') as f:
    raw = f.read()

content = zlib.decompress(raw[12:])

# Parse room 30070 manually
pos = 0
vnum, x, y, z, unknown = struct.unpack('>Iiiii', content[pos:pos+20])
pos += 20
print(f"vnum={vnum}, x={x}, y={y}, z={z}, unknown={unknown}")

name, pos = read_qstring_be(content, pos)
print(f"name='{name}' (pos now {pos})")

desc, pos = read_qstring_be(content, pos)
print(f"desc='{desc[:60]}...' (pos now {pos})")

# What's next?
print(f"\nNext 80 bytes after desc:")
chunk = content[pos:pos+80]
print("  Hex:", binascii.hexlify(chunk).decode())

# Try reading more strings
str3, pos3 = read_qstring_be(content, pos)
print(f"\nString 3: '{str3[:60]}' (would end at pos {pos3})")

str4, pos4 = read_qstring_be(content, pos3)
print(f"String 4: '{str4[:60]}' (would end at pos {pos4})")

str5, pos5 = read_qstring_be(content, pos4)
print(f"String 5: '{str5[:60]}' (would end at pos {pos5})")

# After all strings, check for the next room header
print(f"\nNext 20 bytes after str5:")
chunk2 = content[pos5:pos5+20]
print("  Hex:", binascii.hexlify(chunk2).decode())
next_vnum = struct.unpack('>I', content[pos5:pos5+4])[0]
print(f"  As vnum: {next_vnum}")
