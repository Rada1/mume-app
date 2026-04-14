import zlib, struct, binascii

def read_qs(data, pos):
    if pos+4>len(data): return None,pos
    l=struct.unpack('>I',data[pos:pos+4])[0]; pos+=4
    if l==0xFFFFFFFF: return '',pos
    if l>100000 or pos+l>len(data): return None,pos
    return data[pos:pos+l].decode('utf-16be',errors='replace'),pos+l

with open('arda.mm2','rb') as f: raw=f.read()
c=zlib.decompress(raw[12:])

# Parse room 30070 exactly
pos=0
vnum,x,y,z,unk=struct.unpack('>Iiiii',c[pos:pos+20]); pos+=20
nm,pos=read_qs(c,pos); dc,pos=read_qs(c,pos)
s3,pos=read_qs(c,pos); s4,pos=read_qs(c,pos); s5,pos=read_qs(c,pos)
print(f'After 5 strings: pos={pos}')

# Read 10 exits x 12 bytes
exit_dirs=['n','s','e','w','u','d','ne','nw','se','sw']
for i,dn in enumerate(exit_dirs):
    d,ef,df=struct.unpack('>III',c[pos:pos+12]); pos+=12
    dest = d if d!=0xFFFFFFFF else "NONE"
    print(f'  exit {dn}: dest={dest}, ef={ef}, df={df}')

# Read 16 bytes room flags
tf,lf,rf,pf=struct.unpack('>IIII',c[pos:pos+16]); pos+=16
print(f'Room flags: tf={tf}, lf={lf}, rf={rf}, pf={pf}')
print(f'After exits+flags: pos={pos}')

# Next 24 bytes - what is this?
print(f'Next 24 bytes: {binascii.hexlify(c[pos:pos+24]).decode()}')
next_vnum=struct.unpack('>I',c[pos:pos+4])[0]
print(f'Next vnum (if here): {next_vnum}')
