"""Compose verified source layers once; preserve full animation and stable target pivots."""
from pathlib import Path
from PIL import Image
import json,zipfile,hashlib,math
root=Path(__file__).resolve().parents[1];fx=json.loads((root/'lib/game/magic-fx.json').read_text());out=root/'public/assets/target-spells-v1';out.mkdir(parents=True,exist_ok=True)
profiles={'流星雨':('meteor',(42,4,330,408),(184,285)),'究極光裂術':('disintegrate',(119,6,384,449),(210,370))}
from urllib.parse import unquote
for name,(key,crop,pivot) in profiles.items():
 c=fx[name];layers=[c['frames'],*c.get('layers',[])];count=max(map(len,layers));w,h=crop[2]-crop[0],crop[3]-crop[1];cols=5;rows=math.ceil(count/cols);atlas=Image.new('RGBA',(w*cols,h*rows))
 for i in range(count):
  canvas=None
  for layer in layers:
   if i>=len(layer):continue
   image=Image.open(root/'public'/unquote(layer[i]).lstrip('/')).convert('RGBA')
   if canvas is None:canvas=Image.new('RGBA',image.size)
   canvas.alpha_composite(image)
  atlas.paste(canvas.crop(crop),(i%cols*w,i//cols*h))
 path=out/(key+'.webp');atlas.save(path,lossless=True,method=6)
 c['atlas']={'src':'/assets/target-spells-v1/'+path.name,'width':w,'height':h,'cols':cols,'count':count,'pivotX':pivot[0]-crop[0],'pivotY':pivot[1]-crop[1]};c['targetVc']=.6
(root/'lib/game/magic-fx.json').write_text(json.dumps(fx,ensure_ascii=False,separators=(',',':')))
pack=root/'assets/target-spells-v1.zip'
with zipfile.ZipFile(pack,'w',zipfile.ZIP_DEFLATED) as z:
 for p in out.iterdir():z.write(p,p.name)
manifest={'sha256':hashlib.sha256(pack.read_bytes()).hexdigest(),'files':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in out.iterdir()}}
(root/'lib/game/target-spell-assets.json').write_text(json.dumps(manifest,separators=(',',':')))
print('Target spell pack bytes:',pack.stat().st_size)
