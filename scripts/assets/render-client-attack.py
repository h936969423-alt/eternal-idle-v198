"""Build 8-direction walk, attack and idle frames aligned to existing sprites.
Usage: script <spr-dir> <public-dir> <out-dir>. Reads data files only; nothing from the client is executed."""
import base64,importlib.util,io,json,pathlib,sys
from PIL import Image
spr_dir,public,out=map(pathlib.Path,sys.argv[1:4]);out.mkdir(parents=True,exist_ok=True)
root=pathlib.Path(__file__).resolve();spec=importlib.util.spec_from_file_location('spr',root.parents[1]/'convert-dasu-spr.py');spr=importlib.util.module_from_spec(spec);spec.loader.exec_module(spr)
frames_map=json.loads((root.parents[2]/'lib/game/asset-map.json').read_text())['frames']
# Block numbers differ per graphic, so these were read off labelled contact sheets: (gfx, walk, attack, idle).
BASES={'knight_2hsword':(61,3,4,3),'knight_f':(48,3,4,3),'elf_m_melee':(138,4,5,7),'elf_m_ranged':(138,18,19,21),'elf_f_melee':(37,3,4,3),'elf_f_ranged':(37,15,16,15),'mage_m':(734,22,26,23),'mage_f':(1186,23,26,22),'royal_m':(0,3,22,3),'royal_f':(1,18,20,18),'darkelf_player':(2786,23,25,24)}
def load(g,fid):
 p=spr_dir/f'{g}-{fid}.spr'
 try:return spr.decode(p) if p.exists() else None
 except Exception:return None
def existing(base,kind):
 paths=[public/p.lstrip('/') for p in frames_map.get(f'{base}/{kind}',[])];paths=[p for p in paths if p.exists()]
 return [Image.open(p).convert('RGBA') for p in paths]
def transform(ref,frames,left,top):
 rb,cb=ref.getbbox(),frames[0].getbbox();scale=max(.7,min(1.6,(rb[3]-rb[1])/max(1,cb[3]-cb[1])));return scale,(rb[0]+rb[2])/2-scale*(left+(cb[0]+cb[2])/2),rb[3]-scale*(top+cb[3])
manifest={};sheet=Image.new('RGB',(130*8,150*len(BASES)),(52,64,52))
for row,(base,(g,walk,attack,idle)) in enumerate(BASES.items()):
 ref_a,ref_i=existing(base,'attack'),existing(base,'idle')
 if not ref_a or not ref_i:print('SKIP',base,len(ref_a),len(ref_i));continue
 d=out/base;d.mkdir(exist_ok=True);result={'gfx':g,'walkBlock':walk,'attackBlock':attack,'idleBlock':idle,'walk':{},'attack':{},'idle':{}};samples={}
 base_a=load(g,attack*8+2);base_i=load(g,idle*8+2)
 if not base_a or not base_i:print('SKIP',base,'blocks');continue
 ta=transform(ref_a[0],*base_a);ti=transform(ref_i[0],*base_i);result['attackCanvas']=list(ref_a[0].size);result['idleCanvas']=list(ref_i[0].size);result['attackScale']=round(ta[0],3)
 def write(kind,prefix,block,direction,canvas,t,limit=None):
  loaded=load(g,block*8+direction)
  if not loaded:return []
  images,l,top=loaded;images=images[:limit] if limit else images;result[kind][str(direction)]=len(images);out_frames=[]
  for i,im in enumerate(images):
   r=im.resize((max(1,round(im.width*t[0])),max(1,round(im.height*t[0]))),Image.LANCZOS);c=Image.new('RGBA',canvas);c.paste(r,(round(t[0]*l+t[1]),round(t[0]*top+t[2])),r);c.save(d/f'{prefix}{direction}_{i}.webp','WEBP',quality=85,method=4);out_frames.append(c)
  return out_frames
 for direction in range(8):
  samples[direction]=write('attack','a',attack,direction,ref_a[0].size,ta);write('walk','',walk,direction,ref_i[0].size,ti);write('idle','i',idle,direction,ref_i[0].size,ti,1 if idle==walk else None)
 manifest[base]=result;print('BASE',base,'attack frames',result['attack'].get('2'),'walk',result['walk'].get('2'),'idle',result['idle'].get('2'),'existing attack',len(ref_a),ref_a[0].size,flush=True)
 cells=[ref_a[len(ref_a)//2]]+[samples[k][len(samples[k])//2] if samples.get(k) else None for k in (2,0,1,3,4,5,6)]
 for x,im in enumerate(cells):
  if im:
   t=im.copy();t.thumbnail((128,148));sheet.paste(t,(x*130,row*150),t)
print('ATTACK-MANIFEST '+json.dumps(manifest,separators=(',',':')),flush=True)
buf=io.BytesIO();sheet.save(buf,'JPEG',quality=68);b=base64.b64encode(buf.getvalue()).decode();print('PREVIEW-BEGIN attack')
for i in range(0,len(b),3000):print('B64 '+b[i:i+3000])
print('PREVIEW-END attack',flush=True)
