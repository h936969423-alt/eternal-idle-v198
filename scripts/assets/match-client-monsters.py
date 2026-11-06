"""Match monsters to client sprites by image only, then build walk sheets aligned to their idle clip.
Usage: script <spr-dir> <base-url> <out-dir> [threshold]. Reads data files only; nothing from the client is executed."""
import base64,importlib.util,io,json,math,multiprocessing,pathlib,re,sys,urllib.parse,urllib.request
import numpy as np
from PIL import Image,ImageOps
spr_dir,site,out=pathlib.Path(sys.argv[1]),sys.argv[2],pathlib.Path(sys.argv[3]);out.mkdir(parents=True,exist_ok=True)
THRESHOLD=float(sys.argv[4]) if len(sys.argv)>4 else .82
root=pathlib.Path(__file__).resolve();spec=importlib.util.spec_from_file_location('spr',root.parents[1]/'convert-dasu-spr.py');spr=importlib.util.module_from_spec(spec);spec.loader.exec_module(spr)
SIDE=32;PLAYER_GFX={0,1,61,48,138,37,734,1186,2786,2796}
def feature(im):
 b=im.getbbox()
 if not b:return None
 c=im.crop(b).resize((SIDE,SIDE));a=np.asarray(c.getchannel('A'))>32;g=np.asarray(ImageOps.grayscale(c.convert('RGB')),dtype=np.uint8)*a
 lit=g[a] if a.any() else np.zeros(1,dtype=np.uint8);hist=np.bincount(lit//32,minlength=8)/len(lit)
 return g.ravel(),a.ravel(),(b[2]-b[0])/max(1,b[3]-b[1]),hist.astype(np.float32),float((lit<24).mean())
def read(path):
 m=re.fullmatch(r'(\d+)-(\d+)\.spr',path.name)
 if not m or int(m[1]) in PLAYER_GFX:return None
 try:
  frames,_,_=spr.decode(path)
  f=feature(frames[0]) if frames else None
  return (int(m[1]),int(m[2]),len(frames))+f if f else None
 except Exception:return None
def load(g,fid):
 p=spr_dir/f'{g}-{fid}.spr'
 try:return spr.decode(p) if p.exists() else None
 except Exception:return None
def fetch(path):
 q=urllib.request.Request(site+urllib.parse.quote(path),headers={'User-Agent':'eternal-idle-asset-check'});return urllib.request.urlopen(q,timeout=40).read()
if __name__=='__main__':
 lib=root.parents[2]/'lib/game';anim=json.loads((lib/'combat-animation.json').read_text());done=json.loads((lib/'client-monster-walk.json').read_text())
 names=[n for n,f in sorted(anim.items()) if (c:=f.get('6') or f.get('root')) and 'idle' in c and 'walk' not in c and n not in done and not re.search('城門|守護塔|玩家',n)]
 with multiprocessing.Pool() as pool:items=[x for x in pool.imap_unordered(read,sorted(spr_dir.glob('*.spr')),chunksize=200) if x]
 print('FEATURES',len(items),'MONSTERS',len(names),flush=True)
 gfx=np.array([x[0] for x in items]);fid=np.array([x[1] for x in items]);G=np.stack([x[3] for x in items]).astype(np.float32);M=np.stack([x[4] for x in items]);R=np.array([x[5] for x in items],dtype=np.float32);H=np.stack([x[6] for x in items]);D=np.array([x[7] for x in items],dtype=np.float32)
 gm=G.mean(1,keepdims=True);Gc=G-gm;Gn=np.sqrt((Gc**2).sum(1))+1e-6
 walks={};rows=[];misses=[]
 for name in names:
  clips=anim[name].get('6') or anim[name].get('root');idle=clips['idle']['body']
  try:ref=Image.open(io.BytesIO(fetch(idle['src']))).convert('RGBA').crop((0,0,idle['w'],idle['h']))
  except Exception as e:misses.append((name,'idle'));continue
  f=feature(ref)
  if not f:misses.append((name,'empty'));continue
  g0,m0,r0,h0,d0=f;g0=g0.astype(np.float32);gc=g0-g0.mean();iou=(M&m0).sum(1)/np.maximum(1,(M|m0).sum(1));ncc=(Gc@gc)/(Gn*(np.sqrt((gc**2).sum())+1e-6));score=.5*iou+.25*(ncc+1)
  bad=(np.maximum(R,r0)/np.maximum(.01,np.minimum(R,r0))>1.4)|(D-d0>.1)|(np.abs(H-h0).sum(1)>.7);score[bad]=0
  order=np.argsort(-score)[:12];pick=None
  for i in order:
   direction=int(fid[i])%8;walk=load(int(gfx[i]),direction)
   if score[i]<THRESHOLD:break
   if walk and len(walk[0])>=2:pick=(float(score[i]),int(gfx[i]),direction,walk);break
  if not pick:misses.append((name,round(float(score[order[0]]),3)));continue
  s,g,direction,walk=pick;base=load(g,24+direction) or walk;fr,l0,t0=base;rb=ref.getbbox();cb=fr[0].getbbox();scale=max(.5,min(2,(rb[3]-rb[1])/max(1,cb[3]-cb[1])));tx=(rb[0]+rb[2])/2-scale*(l0+(cb[0]+cb[2])/2);ty=rb[3]-scale*(t0+cb[3])
  images,l,t=walk;cols=min(len(images),4);nrows=math.ceil(len(images)/cols);atlas=Image.new('RGBA',(idle['w']*cols,idle['h']*nrows))
  for i,im in enumerate(images):
   r=im.resize((max(1,round(im.width*scale)),max(1,round(im.height*scale))),Image.LANCZOS);c=Image.new('RGBA',(idle['w'],idle['h']));c.paste(r,(round(scale*l+tx),round(scale*t+ty)),r);atlas.paste(c,(i%cols*idle['w'],i//cols*idle['h']))
  folder=f"m{g}_{idle['w']}x{idle['h']}";(out/folder).mkdir(exist_ok=True);atlas.save(out/folder/'sheet.webp','WEBP',quality=82,method=4)
  walks[name]={'src':f'/assets/client-walk/v1/{folder}/sheet.webp','count':len(images),'w':idle['w'],'h':idle['h'],'cols':cols,'rows':nrows}
  rows.append((s,name,ref,atlas.crop((idle['w'] if len(images)>1 else 0,0,idle['w']*2,idle['h']))))
 print('MATCHED',len(walks),'of',len(names),'threshold',THRESHOLD,flush=True)
 print('MISSES',json.dumps(misses,ensure_ascii=False)[:2500],flush=True)
 ordered=sorted(rows,key=lambda r:r[0]);print('ALL',[f'{i}:{r[1]}:{r[0]:.2f}' for i,r in enumerate(ordered)],flush=True)
 blob=base64.b64encode(json.dumps(walks,ensure_ascii=False,separators=(',',':')).encode()).decode();print('MW-BEGIN')
 for i in range(0,len(blob),3000):print('MW '+blob[i:i+3000])
 print('MW-END',flush=True)
 cell=90;per=6;board=Image.new('RGB',(cell*2*per,cell*max(1,math.ceil(len(ordered)/per))),(52,64,52))
 for i,(_,_,a,b) in enumerate(ordered):
  for j,im in enumerate((a,b)):
   t=im.copy();t.thumbnail((cell-2,cell-2));board.paste(t,((i%per*2+j)*cell,i//per*cell),t)
 buf=io.BytesIO();board.save(buf,'JPEG',quality=58);b=base64.b64encode(buf.getvalue()).decode();print('PREVIEW-BEGIN matched')
 for i in range(0,len(b),3000):print('B64 '+b[i:i+3000])
 print('PREVIEW-END matched',flush=True)
