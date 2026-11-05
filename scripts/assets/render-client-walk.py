"""Convert client walk sprites to frames aligned with each existing idle sprite.
Usage: script <spr-dir> <sprites-root> <out-dir>. Reads data files only."""
import base64,importlib.util,io,json,pathlib,sys
from PIL import Image
spr_dir,sprites,out=map(pathlib.Path,sys.argv[1:4]);out.mkdir(parents=True,exist_ok=True)
spec=importlib.util.spec_from_file_location('spr',pathlib.Path(__file__).resolve().parents[1]/'convert-dasu-spr.py');spr=importlib.util.module_from_spec(spec);spec.loader.exec_module(spr)
# Client action numbers: sword 4, bow 20, staff 40, two-handed sword 50, claw 58. File id = action*8+direction.
BASES={'knight_2hsword':(61,[50,4]),'knight_f':(48,[4]),'elf_m_melee':(138,[4]),'elf_m_ranged':(138,[20,4]),'elf_f_melee':(37,[4]),'elf_f_ranged':(37,[20,4]),'mage_m':(734,[40,4]),'mage_f':(1186,[40,4]),'royal_m':(0,[4]),'royal_f':(1,[4]),'darkelf_player':(2786,[58,4])}
def load(gfx,fid):
 p=spr_dir/f'{gfx}-{fid}.spr'
 return spr.decode(p) if p.exists() else None
manifest={};sheet=Image.new('RGB',(160*9,170*len(BASES)),(52,64,52))
for row,(base,(gfx,actions)) in enumerate(BASES.items()):
 action=next((a for a in actions if (spr_dir/f'{gfx}-{a*8+2}.spr').exists()),None)
 idle_png=sorted((sprites/base/'idle').glob('*.png'),key=lambda p:int(p.stem)) if (sprites/base/'idle').exists() else []
 if action is None or not idle_png:print('SKIP',base,action,len(idle_png));continue
 existing=Image.open(idle_png[0]).convert('RGBA');ebox=existing.getbbox()
 ref=load(gfx,(action+3)*8+2) or load(gfx,action*8+2);frames,left,top=ref;rbox=frames[0].getbbox()
 scale=(ebox[3]-ebox[1])/max(1,rbox[3]-rbox[1]);scale=max(.7,min(1.6,scale))
 tx=(ebox[0]+ebox[2])/2-scale*(left+(rbox[0]+rbox[2])/2);ty=ebox[3]-scale*(top+rbox[3])
 d=out/base;d.mkdir(exist_ok=True);counts={};x=0
 sheet.paste(existing,(0,row*170),existing)
 for direction in range(8):
  loaded=load(gfx,action*8+direction)
  if not loaded:continue
  images,l,t=loaded;counts[str(direction)]=len(images)
  for i,im in enumerate(images):
   w,h=max(1,round(im.width*scale)),max(1,round(im.height*scale));r=im.resize((w,h),Image.LANCZOS)
   c=Image.new('RGBA',existing.size);c.alpha_composite(r,(0,0)) if False else c.paste(r,(round(scale*l+tx),round(scale*t+ty)),r)
   c.save(d/f'{direction}_{i}.webp','WEBP',quality=85,method=4)
   if i==1:
    thumb=c.copy();thumb.thumbnail((158,168));sheet.paste(thumb,((direction+1)*160,row*170),thumb)
 manifest[base]={'action':action,'gfx':gfx,'scale':round(scale,3),'canvas':list(existing.size),'counts':counts}
 print('BASE',base,json.dumps(manifest[base]),flush=True)
print('WALK-MANIFEST '+json.dumps(manifest,separators=(',',':')),flush=True)
buf=io.BytesIO();sheet.resize((sheet.width*3//4,sheet.height*3//4)).save(buf,'JPEG',quality=60);b=base64.b64encode(buf.getvalue()).decode();print('PREVIEW-BEGIN walk')
for i in range(0,len(b),3000):print('B64 '+b[i:i+3000])
print('PREVIEW-END walk',flush=True)
