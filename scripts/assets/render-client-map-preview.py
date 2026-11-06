"""Render 3x3 S32 regions into image tiles and client collision data.
Usage: script <client-dir> <out-dir>. Reads data files only; nothing from the client is executed."""
import base64,io,json,struct,sys,zlib
from functools import lru_cache
from pathlib import Path
from PIL import Image
client,out=Path(sys.argv[1]),Path(sys.argv[2])
REGIONS=[('talking','說話之島村莊',0,0x7ffd,0x8002),('gludio','古魯丁村',4,0x7fff,0x7ffa),('giran','奇岩村',4,0x800a,0x8000)]
if len(sys.argv)>3:
 REGIONS=[(k,k,v['mapId'],v['blockX'],v['blockY']) for k,v in json.loads(Path(sys.argv[3]).read_text()).items()]
CHUNK=1024
tiles={}
if (client/'tiles').is_dir():
 tiles={int(p.stem):p.read_bytes() for p in (client/'tiles').glob('*.til')}
else:
 idx=(client/'Tile.idx').read_bytes();count=struct.unpack_from('<i',idx)[0]
 with open(client/'Tile.pak','rb') as pak:
  for i in range(count):
   off,raw,size=struct.unpack_from('<i20si',idx,4+i*28);name=raw.split(b'\0')[0].decode('latin1').lower()
   if name.endswith('.til') and name[:-4].isdigit():pak.seek(off&0xffffffff);tiles[int(name[:-4])]=pak.read(size)
@lru_cache(maxsize=512)
def tile_data(n):
 b=tiles[n]
 if b[0]==0x78:b=zlib.decompress(b)
 c=struct.unpack_from('<i',b)[0];o=struct.unpack_from('<'+str(c+1)+'i',b,4);return b,o,4+4*(c+1)
@lru_cache(maxsize=30000)
def tile(n,i):
 b,offs,base=tile_data(n)
 if i>=len(offs)-1:raise ValueError((n,i))
 off=offs[i];d=b[base+off:base+min(x for x in offs if x>off)];t=d[0];p=1;im=Image.new('RGBA',(24,24));pix=im.load()
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
 d=path.read_bytes();p=0;ground=[]
 for y in range(64):
  for x in range(128):
   i,n,_=struct.unpack_from('<BHB',d,p);p+=4;ground.append((x,y,i,n))
 c=struct.unpack_from('<H',d,p)[0];p+=2
 for _ in range(c):
  x,y,i,n,_=struct.unpack_from('<BBBHB',d,p);p+=6;ground.append((x,y,i,n))
 attr=[[struct.unpack_from('<HH',d,p+(y*64+x)*4) for x in range(64)] for y in range(64)];p+=16384
 g=struct.unpack_from('<i',d,p)[0];p+=4;upper=[]
 for _ in range(g):
  _,c=struct.unpack_from('<hH',d,p);p+=4
  for _ in range(c):
   x,y,l,i,n,_u=struct.unpack_from('<BBBBhB',d,p);p+=7;upper.append((x,y,l,i,n))
 return ground,attr,upper
for rid,label,m,cx,cy in REGIONS:
 SIZE=192;W=SIZE*48+48;H=SIZE*24+24;OY=(SIZE-1)*12
 print('RENDER',rid,flush=True);im=Image.new('RGBA',(W,H),(0,0,0,0));edges=[[3]*SIZE for _ in range(SIZE)];upper=[];miss=0;found=0
 def put(n,i,X,Y):
  global miss
  try:t=tile(n,i)
  except(KeyError,ValueError,IndexError,struct.error):miss+=1;return
  a,o=X//2,X%2;px=(a+Y)*24+o*24;py=(Y-a)*12+OY
  if -24<px<W and -24<py<H:im.alpha_composite(t,(max(px,0),max(py,0)))
 for dx in (-1,0,1):
  for dy in (-1,0,1):
   p=client/'map'/str(m)/f'{cx+dx:04x}{cy+dy:04x}.s32'
   if not p.exists():continue
   found+=1;ground,attr,up=parse(p);ox,oy=(dx+1)*64,(dy+1)*64
   for x,y,i,n in ground:put(n,i,x+2*ox,y+oy)
   upper+=[(y+oy,x+2*ox,l,i,n) for x,y,l,i,n in up]
   for a in range(64):
    for b in range(64):
     t1,t2=attr[b][a];edges[ox+a][oy+b]=(t1&1)|((t2&1)<<1)
 for Y,X,l,i,n in sorted(upper,key=lambda r:(r[0],r[1],r[2])):put(n,i,X,Y)
 d=out/rid;d.mkdir(parents=True,exist_ok=True);chunks=[]
 for cyi in range(0,H,CHUNK):
  for cxi in range(0,W,CHUNK):
   c=im.crop((cxi,cyi,min(cxi+CHUNK,W),min(cyi+CHUNK,H)))
   if c.getbbox() is None:continue
   c.save(d/f'{cxi//CHUNK}_{cyi//CHUNK}.webp','WEBP',quality=78,method=4);chunks.append([cxi//CHUNK,cyi//CHUNK])
 X0=(cx-1-0x7fff)*64+0x7fff-63;Y0=(cy-1-0x7fff)*64+0x7fff-63
 spawn=next(([a,b] for r in range(96) for a in range(96-r,96+r+1) for b in range(96-r,96+r+1) if 0<a<191 and 0<b<191 and not edges[a][b] and not edges[a][b+1]&1 and not edges[a-1][b]&2),[96,96])
 manifest={'id':rid,'label':label,'mapId':m,'cols':SIZE,'rows':SIZE,'originX':X0,'originY':Y0,'width':W,'height':H,'chunk':CHUNK,'chunks':chunks,'offsetY':OY,'spawn':spawn,'edges':[''.join(str(v) for v in col) for col in edges]}
 (d/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':')))
 small=Image.new('RGB',(W,H),(0,0,0));small.paste(im,(0,0),im);small=small.resize((1100,1100*H//W))
 buf=io.BytesIO();small.save(buf,'JPEG',quality=55);b=base64.b64encode(buf.getvalue()).decode()
 print('REGION',rid,'blocks',found,'chunks',len(chunks),'missing',miss,'KB',sum(f.stat().st_size for f in d.iterdir())//1024,'spawn',spawn,flush=True)
 print(f'PREVIEW-BEGIN {rid}')
 for i in range(0,len(b),3000):print('B64 '+b[i:i+3000])
 print(f'PREVIEW-END {rid}',flush=True)
 del im
