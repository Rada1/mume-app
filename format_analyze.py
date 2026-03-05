"""
No standard MMapper header found. The file starts directly with room data.
Let's figure out the exact layout around room 30070 which we know is at offset 0.

Known:
  offset 0:  vnum=30070 (0x00007576) 
  offset 4:  x=674     (0x000002A2)
  offset 8:  y=450     (0x000001C2)
  offset 12: z=-35     (0xFFFFFFDD)
  
  Then "Vig's Shop" in UTF-16LE starts at offset 25.

So between offset 16 and 25 there are 9 bytes of something.
Let's look at those 9 bytes and try to figure out what they mean.
"""

import zlib, struct

with open('arda.mm2', 'rb') as f:
    raw = f.read()

content = zlib.decompress(raw[12:])
print(f"First 80 bytes hex:")
import binascii
print(binascii.hexlify(content[:80]).decode())

# We know vnum=30070, x=674, y=450, z=-35 are at 0-15
# Let's decode bytes 16-25 (9 bytes before "Vig's Shop")
print(f"\nBytes 16-24: {binascii.hexlify(content[16:25]).decode()}")
print(f"  [16-17] as BE uint16: {struct.unpack('>H', content[16:18])[0]}")
print(f"  [16-17] as LE uint16: {struct.unpack('<H', content[16:18])[0]}")
print(f"  [16-19] as BE uint32: {struct.unpack('>I', content[16:20])[0]}")
print(f"  [16-19] as LE uint32: {struct.unpack('<I', content[16:20])[0]}")
print(f"  [18-21] as BE uint32: {struct.unpack('>I', content[18:22])[0]}")
print(f"  [20-23] as BE uint32: {struct.unpack('>I', content[20:24])[0]}")

# "Vig's Shop" is 10 chars = 20 bytes in UTF-16LE, or 20 bytes in UTF-16BE
# Starts at offset 25 in UTF-16LE, per earlier test
name_target_le = "Vig's Shop".encode('utf-16le')
name_target_be = "Vig's Shop".encode('utf-16be')
le_pos = content.find(name_target_le)
be_pos = content.find(name_target_be)
print(f"\n'Vig's Shop' as UTF-16LE at offset: {le_pos}")
print(f"'Vig's Shop' as UTF-16BE at offset: {be_pos}")

if be_pos != -1:
    print(f"Bytes just before UTF-16BE name: {binascii.hexlify(content[be_pos-4:be_pos]).decode()}")
    length_be = struct.unpack('>I', content[be_pos-4:be_pos])[0]
    length_hi16 = struct.unpack('>H', content[be_pos-4:be_pos-2])[0]
    length_lo16 = struct.unpack('>H', content[be_pos-2:be_pos])[0]
    print(f"  As BE uint32: {length_be} (should be name len in bytes = 20)")
    print(f"  As 2x BE uint16: {length_hi16}, {length_lo16}")

if le_pos != -1:
    print(f"Bytes just before UTF-16LE name at {le_pos}: {binascii.hexlify(content[le_pos-6:le_pos]).decode()}")
