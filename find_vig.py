import zlib, struct, binascii
with open('arda.mm2','rb') as f: raw=f.read()
c=zlib.decompress(raw[12:])

# Find ALL occurrences of "Vig's Shop" in the decompressed buffer
# "Vig's Shop" in UTF-16 BE
target1 = "Vig's Shop".encode('utf-16be')
print(f"Searching for BE: {binascii.hexlify(target1).decode()}")

pos = 0
found = []
while True:
    pos = c.find(target1, pos)
    if pos == -1: break
    found.append(pos)
    pos += 1
    
print(f"Found {len(found)} times at: {found}")

if found:
    pos = found[0]
    print(f"\nContext around {pos}:")
    # Show 64 bytes before and 64 bytes after
    start = max(0, pos - 64)
    end = min(len(c), pos + 64)
    chunk = c[start:end]
    print(f"Hex ({start} to {end}):")
    for i in range(0, len(chunk), 16):
        h = binascii.hexlify(chunk[i:i+16]).decode()
        print(f"  [{start+i:5d}]: {h}")

# Also check LE
target2 = "Vig's Shop".encode('utf-16le')
print(f"\nSearching for LE: {binascii.hexlify(target2).decode()}")
pos = 0
found = []
while True:
    pos = c.find(target2, pos)
    if pos == -1: break
    found.append(pos)
    pos += 1
print(f"Found {len(found)} times at: {found}")
