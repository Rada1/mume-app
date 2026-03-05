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
vnum, x, y, z, unk = struct.unpack('>Iiiii', content[pos:pos+20]); pos += 20
name, pos = read_qstring_be(content, pos)
desc, pos = read_qstring_be(content, pos)
s3, pos = read_qstring_be(content, pos)
s4, pos = read_qstring_be(content, pos)
s5, pos = read_qstring_be(content, pos)

# Print hex in rows of 16 with extra spacing
p = pos
end = p + 136
import sys
row = []
print(f"Hex dump from {p} to {end}:")
for i in range(end - p):
    row.append(f"{content[p+i]:02x}")
    if len(row) == 16 or i == end-p-1:
        print(f"  [{p:5d}]: {' '.join(row)}")
        p += len(row)
        row = []
