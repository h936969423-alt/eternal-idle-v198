"""Build 8-direction attack and idle frames aligned to each existing attack sprite.
Usage: script <spr-dir> <public-dir> <out-dir>. Reads data files only; nothing from the client is executed."""
import base64,importlib.util,io,json,pathlib,sys
from PIL import Image
spr_dir,public,out=map(pathlib.Path,sys.argv[1:4]);out.mkdir(parents=True,exist_ok=True)
root=pathlib.Path(__file__).resolve();spec=importlib.util.spec_from_file_location('spr',root.parents[1]/'convert-dasu-spr.py');spr=importlib.util.module_from_spec(spec);spec.loader.exec_module(spr)
frames_map=json.loads((root.parents[2]/'lib/game/asset-map.json').read_text())['frames']
# Client attack actions: bare 1, sword 5, bow 21, staff 41, two-handed sword 51, claw 59. Idle is attack+2.
BASES={'knight_2hsword':(61,[51,5,1]),'knight_f':(48,[5,1]),'elf_m_melee':(138,[5,1]),'elf_m_ranged':(138,[21,1]),'elf_f_melee':(37,[5,1]),'elf_f_ranged':(37,[21,1]),'mage_m':(734,[41,1]),'mage_f':(1186,[41,1]),'royal_m':(0,[5,1]),'royal_f':(1,[5,1]),'darkelf_player':(2786,[59,1])}
MIN_FRAMES=4
def load(g,fid):
 p=spr_dir/f'{g}-{fid}.spr'
 try:return spr.decode(p) if p.exists() else None
 except Exception:return None
# Action survey: frame counts for direction 2 by action, plus one contact sheet per graphic.
for gfx in sorted({v[0] for v in BASES.values()}|{2796}):
 row=[]
 for a in range(72):
  d=load(gfx,a*8+2)
  if d:row.append((a,len(d[0]),d[0][len(d[0])//2]))
 print('ACTIONS',gfx,[(a,n) for a,n,_ in row],flush=True)
 if gfx in (734,2786,61,37):
  w=Image.new('RGB',(100*10,110*(len(row)//10+1)),(52,64,52))
  for i,(a,n,f) in enumerate(row):
   t=f.copy();t.thumbnail((98,108));w.paste(t,(i%10*100,i//10*110),t)
  b0=io.BytesIO();w.save(b0,'JPEG',quality=55);b1=base64.b64encode(b0.getvalue()).decode();print(f'PREVIEW-BEGIN gfx{gfx}')
  for i in range(0,len(b1),3000):print('B64 '+b1[i:i+3000])
  print(f'PREVIEW-END gfx{gfx}',flush=True)
manifest={};sheet=Image.new('RGB',(150*7,160*len(BASES)),(52,64,52))
for row,(base,(g,actions)) in enumerate(BASES.items()):
 paths=[public/p.lstrip('/') for p in frames_map.get(base+'/attack',[])];paths=[p for p in paths if p.exists()]
 action=next((a for a in actions if (d:=load(g,a*8+2)) and len(d[0])>=MIN_FRAMES),None)
 if not paths or action is None:print('SKIP',base,'attack images',len(paths),'action',action);continue
 existing=[Image.open(p).convert('RGBA') for p in paths];ref=existing[0];rb=ref.getbbox();frames,l0,t0=load(g,action*8+2);cb=frames[0].getbbox()
 scale=max(.7,min(1.6,(rb[3]-rb[1])/max(1,cb[3]-cb[1])));tx=(rb[0]+rb[2])/2-scale*(l0+(cb[0]+cb[2])/2);ty=rb[3]-scale*(t0+cb[3]);d=out/base;d.mkdir(exist_ok=True);result={'action':action,'canvas':list(ref.size),'scale':round(scale,3),'attack':{},'idle':{}}
 def write(kind,prefix,fid,direction):
  loaded=load(g,fid)
  if not loaded:return None
  images,l,t=loaded;result[kind][str(direction)]=len(images);rendered=[]
  for i,im in enumerate(images):
   r=im.resize((max(1,round(im.width*scale)),max(1,round(im.height*scale))),Image.LANCZOS);c=Image.new('RGBA',ref.size);c.paste(r,(round(scale*l+tx),round(scale*t+ty)),r);c.save(d/f'{prefix}{direction}_{i}.webp','WEBP',quality=85,method=4);rendered.append(c)
  return rendered
 samples={}
 for direction in range(8):
  samples[direction]=write('attack','a',action*8+direction,direction);write('idle','i',(action+2)*8+direction,direction)
 manifest[base]=result;print('BASE',base,json.dumps(result),'existing',len(existing),ref.size,flush=True)
 cells=[existing[len(existing)//2]]+[(samples[k][len(samples[k])//2] if samples.get(k) else None) for k in (2,0,4,6,3,7)]
 for x,im in enumerate(cells):
  if im:
   t=im.copy();t.thumbnail((148,158));sheet.paste(t,(x*150,row*160),t)
print('ATTACK-MANIFEST '+json.dumps(manifest,separators=(',',':')),flush=True)
buf=io.BytesIO();sheet.save(buf,'JPEG',quality=62);b=base64.b64encode(buf.getvalue()).decode();print('PREVIEW-BEGIN attack')
for i in range(0,len(b),3000):print('B64 '+b[i:i+3000])
print('PREVIEW-END attack',flush=True)
