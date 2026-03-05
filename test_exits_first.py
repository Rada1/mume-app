"""
Testing hypothesis: maybe the file format puts EXITS BEFORE the name strings.
Structure would be:
  [0-3]   vnum    (BE uint32)
  [4-7]   x       (BE int32)
  [8-11]  y       (BE int32)
  [12-15] z       (BE int32)
  [16-19] flags   (BE uint32)
  [20-139] 10 exits x 12 bytes each (120 bytes)
  [140-155] 4 room flags (16 bytes)
  [156+]  name, desc, ... (Qt QStrings)

Let's test this!
"""

import zlib, struct, binascii

def read_qs(data, pos):
    if pos+4>len(data): return None,pos
    l=struct.unpack('>I',data[pos:pos+4])[0]; pos+=4
    if l==0xFFFFFFFF: return '',pos
    if l>100000 or pos+l>len(data): return None,pos
    return data[pos:pos+l].decode('utf-16be',errors='replace'),pos+l

with open('arda.mm2','rb') as f: raw=f.read()
c=zlib.decompress(raw[12:])

pos=0
vnum,x,y,z,unk=struct.unpack('>Iiiii',c[pos:pos+20]); pos+=20
print(f'vnum={vnum}, x={x}, y={y}, z={z}, unk={unk}')

# Test: read exits BEFORE name
exit_dirs=['n','s','e','w','u','d','ne','nw','se','sw']
for dn in exit_dirs:
    d,ef,df=struct.unpack('>III',c[pos:pos+12]); pos+=12
    dest = d if d!=0xFFFFFFFF else "NONE"
    print(f'  exit {dn}: dest={dest}')

# Room flags (16 bytes)
tf,lf,rf,pf=struct.unpack('>IIII',c[pos:pos+16]); pos+=16
print(f'Room flags: tf={tf}, lf={lf}, rf={rf}, pf={pf}')
print(f'After exits: pos={pos}')

# Now try to read names
nm,pos2=read_qs(c,pos)
print(f'String at pos {pos}: "{nm}"')
