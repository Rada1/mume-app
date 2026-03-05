import zlib, struct, binascii

def read_qstring_be(data, pos):
    if pos + 4 > len(data): return None, pos
    length = struct.unpack('>I', data[pos:pos+4])[0]
    pos += 4
    if length == 0xFFFFFFFF: return '', pos
    if length > 200000 or pos + length > len(data): return None, pos
    text = data[pos:pos+length].decode('utf-16be', errors='replace')
    pos += length
    return text, pos

with open('arda.mm2', 'rb') as f:
    raw = f.read()
content = zlib.decompress(raw[12:])

pos = 0
# Room 1: vnum=30070
vnum, x, y, z, unk = struct.unpack('>Iiiii', content[pos:pos+20]); pos += 20
name, pos = read_qstring_be(content, pos)
desc, pos = read_qstring_be(content, pos)
s3, pos = read_qstring_be(content, pos)
s4, pos = read_qstring_be(content, pos)
s5, pos = read_qstring_be(content, pos)
print(f"Room 30070 '{name}' at ({x},{y},{z})")
print(f"  s3='{s3}', s4='{s4}', s5='{s5[:30]}'")
print(f"  After 5 strings: pos={pos}")
print(f"  Next 60 bytes: {binascii.hexlify(content[pos:pos+60]).decode()}")

# MMapper source shows after description, short_desc, note there are:
# quint8 terrain, quint8 light, quint8 portability, quint8 ridability, quint8 sundeath, quint8 noRide
# That's 6 bytes. Then flags (uint32). Then exit data.
# Let's try reading 6 bytes then checking what's next
print()
print("Bytes as individual values:")
for i in range(20):
    print(f"  [{pos+i}] = 0x{content[pos+i]:02X} = {content[pos+i]}")
