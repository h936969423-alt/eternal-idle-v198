"""Render selected old S32/TIL scenes; usage: script /path/to/map-assets.zip.
Format reference: tony1223/PakViewer S32Reader.cs and L1Til.cs.
Only static layers 1/2/4. Not a collision or whole-world decoder.
"""
import sys,zipfile,struct,zlib,json,io,re
from pathlib import Path
from functools import lru_cache
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
Z=zipfile.ZipFile(sys.argv[1])
@lru_cache(maxsize=256)
def tile_data(n):
 b=Z.read(f'tiles/{n}.til')
 if b[0]==0x78:b=zlib.decompress(b)
 count=struct.unpack_from('<i',b)[0];offsets=struct.unpack_from('<'+str(count+1)+'i',b,4)
 return b,offsets,4+4*(count+1)
@lru_cache(maxsize=15000)
def tile(n,i):
 b,offsets,base=tile_data(n)
 if i>=len(offsets)-1:raise ValueError((n,i))
 off=offsets[i];end=min(x for x in offsets if x>off);d=b[base+off:base+end];t=d[0];p=1
 im=Image.new('RGBA',(24,24));pix=im.load()
 def color(x,y):
  nonlocal p
  c=struct.unpack_from('<H',d,p)[0];p+=2
  if 0<=x<24 and 0<=y<24 and c!=32768:
   r=(c>>10)&31;g=(c>>5)&31;bl=c&31
   pix[x,y]=((r<<3)|(r>>2),(g<<3)|(g>>2),(bl<<3)|(bl>>2),128 if t&4 else 255)
 if not t&2:
  for y in range(24):
   count=2*(y+1) if y<=11 else 2*(23-y)
   start=0 if t&1 else 24-count
   for x in range(start,start+count):color(x,y)
 else:
  sx,sy,w,h=d[p:p+4];p+=4
  for y in range(h):
   x=sx;segments=d[p];p+=1
   for _ in range(segments):
    skip,count=d[p:p+2];p+=2;x+=skip//2
    for _ in range(count):color(x,y+sy);x+=1
 return im

def render(block):
 d=Z.read(block);p=0;records=[]
 for y in range(64):
  for x in range(128):
   index,n,uk=struct.unpack_from('<BHB',d,p);p+=4;records.append((x,y,index,n))
 count=struct.unpack_from('<H',d,p)[0];p+=2
 for _ in range(count):
  x,y,index,n,uk=struct.unpack_from('<BBBHB',d,p);p+=6;records.append((x,y,index,n))
 p+=16384;groups=struct.unpack_from('<i',d,p)[0];p+=4;buildings=[]
 for _ in range(groups):
  group,count=struct.unpack_from('<hH',d,p);p+=4
  for _ in range(count):
   x,y,layer,index,n,uk=struct.unpack_from('<BBBBhB',d,p);p+=7;buildings.append((x,y,layer,index,n))
 records.extend((x,y,i,n) for x,y,l,i,n in sorted(buildings,key=lambda b:(b[1],b[0],b[2])))
 im=Image.new('RGBA',(3096,1560),(13,12,10,255));missing=set()
 for x,y,i,n in records:
  try:t=tile(n,i)
  except (KeyError,ValueError,IndexError,struct.error):missing.add((n,i));continue
  im.alpha_composite(t,((x//2+y)*24+(x%2)*24,(y-x//2)*12+768))
 return im.crop((850,350,2250,1250)).convert('RGB'),len(missing)

# Naming aliases are explicit; no guessed floor mapping for ambiguous zones.
selected={'town_ivory_tower':(75,'象牙塔 1樓','tower-ground-floor'),'zone_13':(1,'冒險洞窟 1樓','talking-island-dungeon-alias'),'zone_14':(2,'冒險洞窟 2樓','talking-island-dungeon-alias'),'rastabad_beast':(455,'1樓 魔獸訓練場','reference-name'),'dark_magic_lab':(461,'2樓 黑魔法研究室','reference-name'),'necro_training':(473,'3樓 冥法軍訓練場','reference-name'),'elder_room':(530,'4樓 格蘭肯神殿、長老．琪娜之室','reference-name'),'fafurion_lair':(65,'法利昂棲息地','lair-name-alias'),'valakas_lair':(67,'巴拉卡斯棲息地','lair-name-alias')}
config_path=ROOT/'lib/game/client-maps.json';config=json.loads(config_path.read_text());dest=ROOT/'public/assets/client-maps'
for zone,(n,name,mapping) in selected.items():
 candidates=[i for i in Z.infolist() if re.fullmatch(f'maps/{n}/[0-9a-fA-F]{{8}}.s32',i.filename)]
 if not candidates:raise ValueError(f'No S32 for {n}')
 block=min(candidates,key=lambda i:abs(i.file_size-180000)).filename
 image,missing=render(block)
 if missing:raise ValueError(f'Missing tiles {zone}: {missing}')
 out=io.BytesIO();image.save(out,format='WEBP',quality=88);path=dest/f'{zone}.webp';path.write_bytes(out.getvalue())
 with Image.open(path) as check:check.verify()
 config[zone]={'src':f'/assets/client-maps/{zone}.webp','mapId':n,'mapName':name,'block':block,'mapping':mapping,'missingTiles':missing}
 print(zone,n,path.stat().st_size,flush=True)
config_path.write_text(json.dumps(config,ensure_ascii=False,indent=2)+'\n')
