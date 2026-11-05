"""Extract tiles from Tile.pak, render collision-overlay previews, and write a data-only bundle.
Usage: script <client-dir> <l1j-maps-dir> <out-dir>. Nothing from the client is executed."""
import base64,collections,hashlib,io,json,re,struct,sys,tarfile,zlib
from functools import lru_cache
from pathlib import Path
from PIL import Image,ImageDraw
client,l1j,out=map(Path,sys.argv[1:4]);out.mkdir(parents=True,exist_ok=True)
idx=(client/'Tile.idx').read_bytes();count=struct.unpack_from('<i',idx)[0];assert 4+count*28==len(idx)
tiles={}
with open(client/'Tile.pak','rb') as pak:
 for i in range(count):
  off,raw,size=struct.unpack_from('<i20si',idx,4+i*28);name=raw.split(b'\0')[0].decode('latin1').lower()
  if name.endswith('.til') and name[:-4].isdigit():
   pak.seek(off&0xffffffff);tiles[int(name[:-4])]=pak.read(size)
print('TIL files',len(tiles),'MB',round(sum(map(len,tiles.values()))/1e6,1),flush=True)
@lru_cache(maxsize=256)
def tile_data(n):
 b=tiles[n]
 if b[0]==0x78:b=zlib.decompress(b)
 c=struct.unpack_from('<i',b)[0];o=struct.unpack_from('<'+str(c+1)+'i',b,4)
 return b,o,4+4*(c+1)
@lru_cache(maxsize=15000)
def tile(n,i):
 b,offs,base=tile_data(n)
 if i>=len(offs)-1:raise ValueError((n,i))
 off=offs[i];d=b[base+off:base+min(x for x in offs if x>off)];t=d[0];p=1
 im=Image.new('RGBA',(24,24));pix=im.load()
 def color(x,y):
  nonlocal p
  c=struct.unpack_from('<H',d,p)[0];p+=2
  if 0<=x<24 and 0<=y<24 and c!=32768:
   r=(c>>10)&31;g=(c>>5)&31;bl=c&31;pix[x,y]=((r<<3)|(r>>2),(g<<3)|(g>>2),(bl<<3)|(bl>>2),128 if t&4 else 255)
 if not t&2:
  for y in range(24):
   k=2*(y+1) if y<=11 else 2*(23-y);s=0 if t&1 else 24-k
   for x in range(s,s+k):color(x,y)
 else:
  sx,sy,w,h=d[p:p+4];p+=4
  for y in range(h):
   x=sx;g=d[p];p+=1
   for _ in range(g):
    a,k=d[p:p+2];p+=2;x+=a//2
    for _ in range(k):color(x,y+sy);x+=1
 return im
def parse(path):
 d=path.read_bytes();p=0;rec=[]
 for y in range(64):
  for x in range(128):
   i,n,_=struct.unpack_from('<BHB',d,p);p+=4;rec.append((x,y,i,n))
 c=struct.unpack_from('<H',d,p)[0];p+=2
 for _ in range(c):
  x,y,i,n,_=struct.unpack_from('<BBBHB',d,p);p+=6;rec.append((x,y,i,n))
 attr=[[struct.unpack_from('<HH',d,p+(y*64+x)*4) for x in range(64)] for y in range(64)];p+=16384
 g=struct.unpack_from('<i',d,p)[0];p+=4;bu=[]
 for _ in range(g):
  _,c=struct.unpack_from('<hH',d,p);p+=4
  for _ in range(c):
   x,y,l,i,n,_u=struct.unpack_from('<BBBBhB',d,p);p+=7;bu.append((x,y,l,i,n))
 rec.extend((x,y,i,n) for x,y,l,i,n in sorted(bu,key=lambda b:(b[1],b[0],b[2])))
 return rec,attr
INFO={0:(32256,32767,32768,33279),4:(32448,34303,32064,33599)}
grids={m:[[int(v) for v in l.split(',') if v.strip()] for l in (l1j/f'{m}.txt').read_text().strip().split('\n')] for m in INFO}
def walk(m,x,y):
 x0,_,y0,_=INFO[m];t=grids[m][x-x0][y-y0];return bool(t&3) and not t&128
corr=collections.Counter();total=0
def render(m,block):
 rec,attr=parse(client/'map'/str(m)/block);bx,by=int(block[:4],16),int(block[4:8],16)
 X0=(bx-0x7fff)*64+0x7fff;Y0=(by-0x7fff)*64+0x7fff
 im=Image.new('RGBA',(3096,1560),(13,12,10,255));miss=0
 for x,y,i,n in rec:
  try:t=tile(n,i)
  except(KeyError,ValueError,IndexError,struct.error):miss+=1;continue
  im.alpha_composite(t,((x//2+y)*24+(x%2)*24,(y-x//2)*12+768))
 ov=Image.new('RGBA',im.size,(0,0,0,0));dr=ImageDraw.Draw(ov);global total
 for a in range(64):
  for b in range(64):
   w=walk(m,X0+a,Y0+b);total+=1;v=attr[b][a]
   for s,val in enumerate(v):
    for bit in range(8):corr[(s,bit)]+=((val>>bit)&1)==(1 if w else 0)
   if not w:
    px,py=(a+b)*24,(b-a)*12+768;dr.polygon([(px+24,py),(px+48,py+12),(px+24,py+24),(px,py+12)],fill=(255,40,40,110))
 base=im.crop((850,350,2250,1250)).convert('RGB');mix=Image.alpha_composite(im,ov).crop((850,350,2250,1250)).convert('RGB')
 return base,mix,miss
previews=out/'previews';previews.mkdir(exist_ok=True)
for name,m,block in [('town_talking',0,'7ffd8002.s32'),('town_gludio',4,'7fff7ffa.s32'),('town_giran',4,'800a8000.s32')]:
 if not (client/'map'/str(m)/block).exists():print('no block',name,block);continue
 base,mix,miss=render(m,block);print(name,'missing tiles',miss,flush=True)
 sheet=Image.new('RGB',(1400,450));sheet.paste(base.resize((700,450)),(0,0));sheet.paste(mix.resize((700,450)),(700,0))
 buf=io.BytesIO();sheet.save(buf,'JPEG',quality=55);(previews/f'{name}.jpg').write_bytes(buf.getvalue())
 b=base64.b64encode(buf.getvalue()).decode();print(f'PREVIEW-BEGIN {name}')
 for i in range(0,len(b),3000):print('B64 '+b[i:i+3000])
 print(f'PREVIEW-END {name}',flush=True)
print('cells',total,'attr-bit agreement with L1J walkability',[(k,round(v/total,3)) for k,v in corr.most_common(6)],[(k,round(v/total,3)) for k,v in corr.most_common()[-4:]])
files=[p for p in (client/'map').rglob('*') if p.is_file() and p.suffix.lower() in('.s32','.seg') and re.fullmatch(r'\d+(_\d+)?',p.parent.name) and re.fullmatch(r'[0-9a-fA-F]{8}\.(s32|seg)',p.name,re.I)]
bundle=out/'client-map-source.tar'
with tarfile.open(bundle,'w') as tar:
 for p in sorted(files):tar.add(p,arcname=f'map/{p.parent.name}/{p.name.lower()}')
 for n,b in sorted(tiles.items()):
  info=tarfile.TarInfo(f'tiles/{n}.til');info.size=len(b);tar.addfile(info,io.BytesIO(b))
h=hashlib.sha256()
with open(bundle,'rb') as f:
 while c:=f.read(1<<20):h.update(c)
json.dump({'sha256':h.hexdigest(),'blocks':len(files),'tiles':len(tiles),'bytes':bundle.stat().st_size},open(out/'manifest.json','w'))
print('BUNDLE',open(out/'manifest.json').read())
