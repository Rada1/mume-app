import zlib, struct, json, collections

def read_qstring_be(data, pos):
    if pos + 4 > len(data): return None, pos
    length = struct.unpack('>I', data[pos:pos+4])[0]
    pos += 4
    if length == 0xFFFFFFFF: return '', pos
    if length > 100000 or pos + length > len(data): return None, pos
    return data[pos:pos+length].decode('utf-16be', errors='replace'), pos+length

def parse(filepath):
    with open(filepath,'rb') as f: raw=f.read()
    content = b""
    for off in range(32):
        try:
            content = zlib.decompress(raw[off:])
            if len(content)>10000: break
        except: pass

    rooms = {}
    pos = 0
    exit_dirs = ['n','s','e','w','u','d','ne','nw','se','sw']
    
    while pos < len(content) - 156:
        saved = pos
        try:
            vnum,x,y,z,unk = struct.unpack('>Iiiii', content[pos:pos+20]); pos+=20
            if not (0<vnum<200000): pos=saved+1; continue
            if not (-50000<x<50000 and -50000<y<50000 and -5000<z<5000): pos=saved+1; continue
            
            name,pos = read_qstring_be(content,pos)
            if name is None: pos=saved+1; continue
            desc,pos = read_qstring_be(content,pos)
            if desc is None: pos=saved+1; continue
            s3,pos = read_qstring_be(content,pos)
            if s3 is None: pos=saved+1; continue
            s4,pos = read_qstring_be(content,pos)
            if s4 is None: pos=saved+1; continue
            s5,pos = read_qstring_be(content,pos)
            if s5 is None: pos=saved+1; continue
            
            if len(name)==0 or len(name)>200: pos=saved+1; continue
            if pos+136>len(content): pos=saved+1; continue
            
            exits={}
            for dn in exit_dirs:
                d,ef,df=struct.unpack('>III',content[pos:pos+12]); pos+=12
                if d!=0xFFFFFFFF and 0<d<200000: exits[dn]=d
            
            pos+=16  # room flags
            rooms[str(vnum)]={'x':x*0.1,'y':y*0.1,'z':z,'name':name}
        except struct.error:
            pos=saved+1

    return rooms

rooms = parse('arda.mm2')
print(f"Parsed {len(rooms)} rooms")

# Quick analysis
if rooms:
    valid = [(k,v) for k,v in rooms.items() if abs(v['x'])>0.1 or abs(v['y'])>0.1]
    print(f"With non-zero coords: {len(valid)}")
    sample = [(k,v) for k,v in rooms.items() if 'Shop' in v['name'] or 'Gate' in v['name'] or 'Bridge' in v['name']][:5]
    print(f"Known landmarks: {[(k,v['name'],v['x'],v['y'],v['z']) for k,v in sample]}")
    print(f"Room 30070: {rooms.get('30070')}")
    
    # Check for false positives (low vnum with sequential coords)
    suspicious = [(k,v) for k,v in rooms.items() if 1<int(k)<100 and v['y']==int(k)*0.1]
    print(f"Suspicious sequential rooms: {len(suspicious)}")
