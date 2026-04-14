import zlib, struct, binascii
with open('arda.mm2','rb') as f: raw=f.read()
c=zlib.decompress(raw[12:])
chunk = c[0:89]
print('Hex chunk (0-88):')
for i in range(0,len(chunk),16):
    slice = chunk[i:i+16]
    hex_str = binascii.hexlify(slice).decode()
    asc_str = "".join([chr(b) if 32<=b<=126 else "." for b in slice])
    print(f"  [{i:3d}]: {hex_str}")
    print(f"         {asc_str}")
