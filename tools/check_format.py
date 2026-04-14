import zlib, struct, binascii
with open('arda.mm2','rb') as f: raw=f.read()
c=zlib.decompress(raw[12:])
print('Bytes 156-220 hex:')
chunk = c[156:220]
for i in range(0,len(chunk),4):
    print(f'  [{156+i}]: {binascii.hexlify(chunk[i:i+4]).decode()}  BE={struct.unpack(">I",chunk[i:i+4])[0]}')
# Bytes 156-159 as uint16s
a,b=struct.unpack('>HH',c[156:160])
print(f'As 2x uint16: {a}, {b}')
# Maybe Qt used 2-byte lengths in some version?
# 'Vig' in UTF-16BE is 00 56 00 69 00 67
vig_be = c[156:180]
print('Raw bytes 156-180:', binascii.hexlify(vig_be).decode())
