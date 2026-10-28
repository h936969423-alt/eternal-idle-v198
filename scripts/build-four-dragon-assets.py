import hashlib, os, json, pathlib, urllib.request, urllib.parse, concurrent.futures, math, io, tempfile, shutil
from PIL import Image
root=pathlib.Path(__file__).resolve().parents[1]
source=json.loads((root/'lib/game/four-dragon-source.json').read_text())
files={}
for name in ['安塔瑞斯','法利昂','巴拉卡斯','林德拜爾']:
 url='https://api.github.com/repos/'+source['repository']+'/contents/assets/anim/'+urllib.parse.quote(name)+'?ref='+source['commit']
 rows=json.load(urllib.request.urlopen(url,timeout=30))
 import re
 files[name]=[{'name':r['name'],'url':r['download_url']} for r in rows if re.fullmatch(r'skill_effect_\d+\.png',r['name']) or re.fullmatch(r'(idle|attack|skill|death|spawn)(_[sw]2?)?_\d+\.png',r['name'])]
cache=pathlib.Path(tempfile.mkdtemp(prefix='four-dragon-source-'))
def get(arg):
 name,f=arg; dest=cache/name/f['name']; dest.parent.mkdir(exist_ok=True)
 if not dest.exists():
  for attempt in range(3):
   try:
    dest.write_bytes(urllib.request.urlopen(urllib.parse.quote(f['url'],safe=':/?=&%'),timeout=35).read()); break
   except Exception:
    if attempt==2: raise
 return dest
jobs=[(n,f) for n,fs in files.items() for f in fs]
with concurrent.futures.ThreadPoolExecutor(max_workers=18) as pool:
 for i,_ in enumerate(pool.map(get,jobs)):
  if i%40==0: print(f'downloaded {i+1}/{len(jobs)}',flush=True)
out=root/'public/assets/four-dragons'; out.mkdir(parents=True,exist_ok=True)
manifest={}
ids={'安塔瑞斯':'antaras','法利昂':'fafurion','巴拉卡斯':'valakas','林德拜爾':'lindvior'}
for name,fs in files.items():
 entry={}
 prefixes=sorted({f['name'].rsplit('_',1)[0] for f in fs})
 for prefix in prefixes:
  seq=sorted((cache/name/f['name'] for f in fs if f['name'].rsplit('_',1)[0]==prefix),key=lambda p:int(p.stem.rsplit('_',1)[1]))
  ims=[Image.open(p).convert('RGBA') for p in seq]; w=max(im.width for im in ims); h=max(im.height for im in ims)
  cols=math.ceil(math.sqrt(len(ims))); atlas=Image.new('RGBA',(w*cols,h*math.ceil(len(ims)/cols)))
  for i,im in enumerate(ims): atlas.paste(im,(i%cols*w,i//cols*h))
  filename=f'{ids[name]}-{prefix}.webp'; buffer=io.BytesIO(); atlas.save(buffer,format='WEBP',lossless=True); dest=out/filename; tmp=out/(filename+'.tmp'); tmp.write_bytes(buffer.getvalue()); os.replace(tmp,dest)
  entry[prefix]={'src':'/assets/four-dragons/'+filename,'count':len(ims),'w':w,'h':h,'cols':cols,'rows':math.ceil(len(ims)/cols),'bytes':len(buffer.getvalue()),'sha256':hashlib.sha256(buffer.getvalue()).hexdigest()}
 manifest[ids[name]]=entry
(root/'lib/game/four-dragon-atlases.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('assets ready',sum(p.stat().st_size for p in out.iterdir()),flush=True)

shutil.rmtree(cache)
