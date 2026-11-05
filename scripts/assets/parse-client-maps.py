"""Read-only analysis of extracted client map data. Usage: script <extracted-dir>.
Never executes client files. Reports index format and S32 tile requirements."""
import collections,re,struct,sys
from pathlib import Path
root=Path(sys.argv[1])
def plain_names(b):
 if len(b)<4:return None
 count=struct.unpack_from('<i',b)[0]
 if count<=0 or 4+count*28!=len(b):return None
 out=[]
 for i in range(count):
  off,raw,size=struct.unpack_from('<i20si',b,4+i*28)
  out.append((raw.split(b'\0')[0].decode('latin1'),off,size))
 return out
for idx in sorted(root.rglob('*.[iI][dD][xX]')):
 b=idx.read_bytes();names=plain_names(b);pak=idx.with_suffix('.pak')
 print(f'IDX {idx.relative_to(root)} size={len(b)} head={b[:24].hex()} rem28={(len(b)-4)%28}')
 if names:
  ext=collections.Counter(n.rsplit('.',1)[-1].lower() for n,_,_ in names)
  print('  plain entries',len(names),ext.most_common(6),'sample',[n for n,_,_ in names[:4]])
blocks=[p for p in root.rglob('*') if p.suffix.lower()=='.s32']
maps=collections.Counter();need=collections.Counter();bad=0;layout=collections.Counter()
for p in blocks:
 mid=p.parent.name;maps[mid]+=1
 if not re.fullmatch(r'[0-9a-fA-F]{8}\.s32',p.name):layout['name:'+p.name[:6]]+=1
 try:
  d=p.read_bytes();q=0
  for _ in range(64*128):
   _,n,_u=struct.unpack_from('<BHB',d,q);q+=4;need[n]+=1
  c=struct.unpack_from('<H',d,q)[0];q+=2
  for _ in range(c):
   _,_,_,n,_u=struct.unpack_from('<BBBHB',d,q);q+=6;need[n]+=1
  q+=16384;g=struct.unpack_from('<i',d,q)[0];q+=4
  for _ in range(g):
   _,c=struct.unpack_from('<hH',d,q);q+=4
   for _ in range(c):
    _,_,_,_,n,_u=struct.unpack_from('<BBBBhB',d,q);q+=7;need[n]+=1
 except struct.error:bad+=1
print('S32 blocks',len(blocks),'maps',len(maps),'parse failures',bad,'layout',dict(layout))
print('top maps',maps.most_common(10))
print('distinct til ids',len(need),'sample',sorted(need)[:12])
seg=[p for p in root.rglob('*') if p.suffix.lower()=='.seg']
print('SEG',len(seg),[f'{p.relative_to(root)}:{p.stat().st_size}' for p in seg[:3]])
md=[p for p in root.rglob('*') if p.suffix.lower()=='.map']
print('MAP',len(md),[f'{p.relative_to(root)}:{p.stat().st_size}' for p in md[:3]])
print('top entries',collections.Counter(str(p.relative_to(root)).split('/')[0] for p in root.rglob('*') if p.is_file()).most_common(12))
print('pak listing is in the workflow log')
