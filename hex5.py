import zlib, struct, binascii
with open('arda.mm2','rb') as f: raw=f.read()
c=zlib.decompress(raw[12:])
chunk = c[0:80]
for i in range(0,len(chunk),16):
    s = chunk[i:i+16]
    print(f"[{i:2d}]: {binascii.hexlify(s).decode()}")
    print("      " + "".join([chr(b) if 32<=b<=126 else "." for b in s]))
