"""Measure ground contacts without rewriting the original sprite sheets.

Only monster bodies are indexed. Alive poses share the first idle contact;
death animation remains free. Shadows and weapons do not define the contact.
"""
import json
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
def read(p):return json.loads((ROOT/p).read_text())
def ground(im):
 a=im.convert('RGBA').getchannel('A').point(lambda p:255 if p>=40 else 0)
 box=a.getbbox()
 if not box:return None
 # Use the lowest body band, excluding upper-body motion and weapon reach.
 left,top,right,bottom=box;band=max(4,min(12,round((bottom-top)*.12)))
 strip=a.crop((0,max(top,bottom-band),im.width,bottom));hist=[0]*im.width
 for y in range(strip.height):
  for x in range(left,right):hist[x]+=bool(strip.getpixel((x,y)))
 total=sum(hist)
 if not total:return [(left+right)/2,bottom]
 def percentile(frac):
  at=0
  for x,n in enumerate(hist):
   at+=n
   if at>=total*frac:return x
 return [(percentile(.1)+percentile(.9))/2,bottom]
def atlas(a):
 im=Image.open(ROOT/'public'/a['src'].lstrip('/'));w,h=a['w'],a['h']
 return [ground(im.crop(((i%a['cols'])*w,(i//a['cols'])*h,(i%a['cols']+1)*w,(i//a['cols']+1)*h))) for i in range(a['count'])]
data=read('lib/game/gamedata.json');meta=read('lib/game/combat-animation.json');atlases={}
for mob in data['mobs'].values():
 for clips in meta.get(mob['n'],{}).values():
  for action,clip in clips.items():
   if action=='death':continue
   a=clip['body']
   if a['src'] not in atlases:atlases[a['src']]=atlas(a)
# SPR bodies use the source origin and per-frame offsets, so contacts are
# expressed relative to that origin and applied equally to all attached layers.
defs=read('public/assets/dragon381/definitions.json')['nodes'];frames={};idle={};cache={}
resolve=lambda x:{15492:2001,12750:4160,12751:4160,15930:762}.get(x,x)
for gfx in sorted({resolve(m['sourceGfx']) for m in data['mobs'].values() if m.get('sourceGfx')}):
 node=defs.get(str(gfx))
 if not node:continue
 for action in node['actions']:
  direction=(6%4 if node['id']==129 else 6) if action['directional'] else 0
  for sf in action['frames']:
   group=sf['ImageId']+direction;key=f"{node['base']}-{group}"
   folder=ROOT/'public/assets/dragon381/sprites'/key;file=folder/'frames.json'
   if not file.exists():continue
   if key not in cache:
    positions={}
    for f in json.loads(file.read_text())['frames']:
     if f.get('empty'):continue
     src=folder/f"atlas-{f.get('page',0):03d}.webp"
     with Image.open(src) as sheet:p=ground(sheet.crop((f['x'],f['y'],f['x']+f['width'],f['y']+f['height'])))
     if p:positions[f['index']]=[p[0]+f['xOffset'],p[1]+f['yOffset']]
    cache[key]=positions
   for index,p in cache[key].items():frames[f'{key}:{index}']=p
  if action['id']==3 and action['frames']:
   sf=next((f for f in action['frames'] if f.get('Duration',0)>0),action['frames'][0]);key=f"{node['base']}-{sf['ImageId']+direction}"
   p=cache.get(key,{}).get(sf['FrameIndex'])
   if p:idle[str(gfx)]=p
out=ROOT/'lib/game/monster-ground-anchors.json';out.write_text(json.dumps({'atlases':atlases,'sourceFrames':frames,'sourceIdle':idle},ensure_ascii=False,separators=(',',':'))+'\n')
print(f'Monster ground contacts: {len(atlases)} sheets, {len(frames)} SPR frames, {len(idle)} SPR idle anchors; {out.stat().st_size} bytes')
