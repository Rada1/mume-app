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
vnum, x, y, z, unknown = struct.unpack('>Iiiii', content[pos:pos+20]); pos += 20
print(f"vnum={vnum}, x={x}, y={y}, z={z}, unknown={unknown}")
name, pos = read_qstring_be(content, pos)
print(f"name='{name}' ends at {pos}")
desc, pos = read_qstring_be(content, pos)
print(f"desc='{desc[:40]}' ends at {pos}")
s3, p3 = read_qstring_be(content, pos)
print(f"str3='{s3[:60]}' ends at {p3}")
s4, p4 = read_qstring_be(content, p3)
print(f"str4='{s4[:60]}' ends at {p4}")
s5, p5 = read_qstring_be(content, p4)
print(f"str5='{s5[:60]}' ends at {p5}")

# Show next 40 bytes as hex with individual byte meanings
print(f"\n--- After 5 strings, pos={p5} ---")
print("Hex:", binascii.hexlify(content[p5:p5+40]).decode())
# Check each byte
for i in range(20):
    b = content[p5+i]
    print(f"  [{p5+i}] = 0x{b:02X} = {b}")

# What is the next vnum?
print()
for offset in range(10):
    v = struct.unpack('>I', content[p5+offset:p5+offset+4])[0]
    if 0 < v < 150000:
        print(f"  Possible next vnum at +{offset}: {v}")
