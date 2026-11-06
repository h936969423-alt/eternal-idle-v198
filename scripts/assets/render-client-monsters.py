"""Match monsters to client sprites by image and build walk sheets aligned to their idle clip.
Usage: script <spr-dir> <base-url> <out-dir>. Reads data files only; nothing from the client is executed."""
import base64,importlib.util,io,json,math,pathlib,sys,urllib.parse,urllib.request
from PIL import Image,ImageOps
spr_dir,site,out=pathlib.Path(sys.argv[1]),sys.argv[2],pathlib.Path(sys.argv[3]);out.mkdir(parents=True,exist_ok=True)
root=pathlib.Path(__file__).resolve();spec=importlib.util.spec_from_file_location('spr',root.parents[1]/'convert-dasu-spr.py');spr=importlib.util.module_from_spec(spec);spec.loader.exec_module(spr)
cands=json.loads(root.with_name('client-monster-candidates.json').read_text());anim=json.loads((root.parents[2]/'lib/game/combat-animation.json').read_text())
THRESHOLD=.74
def fetch(path):
 q=urllib.request.Request(site+urllib.parse.quote(path),headers={'User-Agent':'eternal-idle-asset-check'});return urllib.request.urlopen(q,timeout=40).read()
def load(gfx,fid):
 p=spr_dir/f'{gfx}-{fid}.spr'
 try:return spr.decode(p) if p.exists() else None
 except Exception:return None
def norm(im):
 b=im.getbbox()
 if not b:return None
 c=im.crop(b).resize((48,48));a=c.getchannel('A');g=Image.new('L',(48,48));g.paste(ImageOps.grayscale(c.convert('RGB')),(0,0),a);gray=list(g.getdata());mask=[v>32 for v in a.getdata()];lit=[p for p,q in zip(gray,mask) if q] or [0]
 hist=[0]*8
 for p in lit:hist[p//32]+=1/len(lit)
 return gray,mask,(b[2]-b[0])/max(1,b[3]-b[1]),hist,sum(p<24 for p in lit)/len(lit)
def score(x,y):
 if not x or not y:return 0
 gx,ax,rx,hx,dark_x=x;gy,ay,ry,hy,dark_y=y
 if max(rx,ry)/max(.01,min(rx,ry))>1.5 or dark_y-dark_x>.2 or sum(abs(p-q) for p,q in zip(hx,hy))>.9:return 0
 both=sum(p and q for p,q in zip(ax,ay));iou=both/max(1,sum(p or q for p,q in zip(ax,ay)));mx=sum(gx)/len(gx);my=sum(gy)/len(gy);n=sum((p-mx)*(q-my) for p,q in zip(gx,gy));dx=math.sqrt(sum((p-mx)**2 for p in gx));dy=math.sqrt(sum((q-my)**2 for q in gy));return .5*iou+.25*(n/max(1,dx*dy)+1)
walks={};rows=[];misses=[];cache={}
for name,gfxs in sorted(cands.items()):
 clips=anim[name].get('6') or anim[name].get('root');idle=clips['idle']['body']
 try:sheet=Image.open(io.BytesIO(fetch(idle['src']))).convert('RGBA')
 except Exception as e:misses.append((name,'idle',repr(e)[:60]));continue
 ref=sheet.crop((0,0,idle['w'],idle['h']));rn=norm(ref);best=(0,None,6)
 for g in gfxs:
  for direction in range(8):
   for fid in (24+direction,direction):
    k=(g,fid)
    if k not in cache:
     d=load(g,fid);cache[k]=norm(d[0][0]) if d and d[0] else None
    s=score(rn,cache[k])
    if s>best[0]:best=(s,g,direction)
 s,g,direction=best if best[1] is not None else (0,None,6)
 walk=load(g,direction) if g is not None else None
 if s<THRESHOLD or not walk or len(walk[0])<2:misses.append((name,round(s,3),g,len(walk[0]) if walk else 0));continue
 base=load(g,24+direction) or walk;fr,l0,t0=base;rb=ref.getbbox();cb=fr[0].getbbox();scale=max(.5,min(2,(rb[3]-rb[1])/max(1,cb[3]-cb[1])));tx=(rb[0]+rb[2])/2-scale*(l0+(cb[0]+cb[2])/2);ty=rb[3]-scale*(t0+cb[3])
 images,l,t=walk;cols=min(len(images),4);rowsn=math.ceil(len(images)/cols);atlas=Image.new('RGBA',(idle['w']*cols,idle['h']*rowsn))
 for i,im in enumerate(images):
  r=im.resize((max(1,round(im.width*scale)),max(1,round(im.height*scale))),Image.LANCZOS);c=Image.new('RGBA',(idle['w'],idle['h']));c.paste(r,(round(scale*l+tx),round(scale*t+ty)),r);atlas.paste(c,(i%cols*idle['w'],i//cols*idle['h']))
 folder=f"m{g}_{idle['w']}x{idle['h']}";(out/folder).mkdir(exist_ok=True);atlas.save(out/folder/'sheet.webp','WEBP',quality=82,method=4)
 walks[name]={'src':f'/assets/client-walk/v1/{folder}/sheet.webp','count':len(images),'w':idle['w'],'h':idle['h'],'cols':cols,'rows':rowsn}
 rows.append((s,name,ref,atlas.crop((idle['w'] if len(images)>1 else 0,0,idle['w']*2,idle['h']))))
print('MATCHED',len(walks),'of',len(cands),'threshold',THRESHOLD,flush=True)
print('MISSES',json.dumps(misses,ensure_ascii=False)[:2800],flush=True)
print('SCORES',[round(r[0],2) for r in sorted(rows,key=lambda r:r[0])][:40],flush=True)
blob=base64.b64encode(json.dumps(walks,ensure_ascii=False,separators=(',',':')).encode()).decode();print('MW-BEGIN')
for i in range(0,len(blob),3000):print('MW '+blob[i:i+3000])
print('MW-END',flush=True)
worst=sorted(rows,key=lambda r:r[0])[:72];cell=90;board=Image.new('RGB',(cell*2*6,cell*math.ceil(len(worst)/6)),(52,64,52))
for i,(s,n,a,b) in enumerate(worst):
 for j,im in enumerate((a,b)):
  t=im.copy();t.thumbnail((cell-2,cell-2));board.paste(t,((i%6*2+j)*cell,i//6*cell),t)
buf=io.BytesIO();board.save(buf,'JPEG',quality=58);b=base64.b64encode(buf.getvalue()).decode();print('PREVIEW-BEGIN monsters')
for i in range(0,len(b),3000):print('B64 '+b[i:i+3000])
print('PREVIEW-END monsters',flush=True)
