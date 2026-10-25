"""Decode legacy Lineage little-endian tile SPR into complete RGBA animations.
Format cross-checked against tony1223/PakViewer SprReader (not first-frame previews).
"""
import struct, pathlib, hashlib, json, math
from PIL import Image

def decode(path):
 data=path.read_bytes();pos=0
 def read(fmt):
  nonlocal pos
  s=struct.Struct('<'+fmt);v=s.unpack_from(data,pos);pos+=s.size;return v[0] if len(v)==1 else v
 n=read('B');palette=None
 if n==255:
  size=read('B') or 256;palette=[read('H') for _ in range(size)];n=read('B')
 assert 0<n<=255
 refs=[]
 for _ in range(n):
  header=read('hhhhHHH');refs.append([read('bbBH') for _ in range(header[-1])])
 count=read('I');assert count<100000
 offsets=[read('I') for _ in range(count)];size=read('I');base=pos
 assert all(0<=offset<len(data)-base for offset in offsets)
 blocks=[]
 for off in offsets:
  pos=base+off;x0,y0,_,lines=read('BBBB');assert y0+lines<=24
  im=Image.new('RGBA',(24,24));pix=im.load()
  for y in range(y0,y0+lines):
   x=x0
   for _ in range(read('B')):
    skip,length=read('BB');x+=skip//2;assert x+length<=24
    for xx in range(x,x+length):
     c=palette[read('B')] if palette is not None else read('H')
     if c!=32768:
      r,g,b=(c>>10)&31,(c>>5)&31,c&31;pix[xx,y]=(r*255//31,g*255//31,b*255//31,255)
    x+=length
  blocks.append(im)
 def xy(a,b):
  # floor(a/2) matches the client's signed isometric block coordinates.
  half=a//2;return 24*(b+a-half),12*(b-half)
 points=[xy(a,b) for frame in refs for a,b,_,idx in frame]
 if not points:return [Image.new('RGBA',(1,1)) for _ in range(n)],0,0
 left=min(x for x,y in points);top=min(y for x,y in points)
 width=max(x for x,y in points)+24-left;height=max(y for x,y in points)+24-top
 assert 0<width<=2048 and 0<height<=2048
 frames=[]
 for frame in refs:
  im=Image.new('RGBA',(width,height))
  for a,b,_,idx in frame:
   assert idx<len(blocks);x,y=xy(a,b);im.alpha_composite(blocks[idx],(x-left,y-top))
  frames.append(im)
 return frames,left,top

if __name__=='__main__':
 import sys
 root=pathlib.Path(sys.argv[1]);out=pathlib.Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
 catalog=[];decoded={};errors=[]
 for p in sorted(p for p in root.rglob('*') if p.suffix.lower()=='.spr'):
  rel=p.relative_to(root).as_posix();digest=hashlib.sha256(p.read_bytes()).hexdigest();key=digest[:20]
  try:
   if key not in decoded:
    frames,left,top=decode(p);w,h=frames[0].size
    cols=max(1,min(len(frames),4096//w,math.ceil(math.sqrt(len(frames)*h/w))))
    rows=math.ceil(len(frames)/cols);assert rows*h<=8192
    sheet=Image.new('RGBA',(w*cols,h*rows))
    for i,im in enumerate(frames):sheet.paste(im,(i%cols*w,i//cols*h))
    sheet.save(out/(key+'.webp'),lossless=True,method=4)
    decoded[key]={'sheet':key+'.webp','width':w,'height':h,'count':len(frames),'cols':cols,'left':left,'top':top,'fps':12}
   catalog.append({'path':rel,'code':p.stem,'hash':digest,'clip':key})
  except Exception as e:errors.append({'path':rel,'error':repr(e)})
 (out/'decoded.json').write_text(json.dumps({'clips':decoded,'entries':catalog,'errors':errors},ensure_ascii=False,indent=2))
 print(json.dumps({'files':len(catalog),'unique':len(decoded),'errors':errors},ensure_ascii=False))
