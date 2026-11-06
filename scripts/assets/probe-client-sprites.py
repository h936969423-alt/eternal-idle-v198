"""Find player walk sprites inside client Sprite paks. Usage: script <client-dir> <out-dir>.
Reads data files only; nothing from the client is executed."""
import base64,importlib.util,io,json,pathlib,re,struct,sys,zlib
from PIL import Image
client,out=pathlib.Path(sys.argv[1]),pathlib.Path(sys.argv[2]);(out/'spr').mkdir(parents=True,exist_ok=True)
GFX={'prince':0,'princess':1,'knight_m':61,'knight_f':48,'elf_m':138,'elf_f':37,'mage_m':734,'mage_f':1186,'dark_m':2786,'dark_f':2796}
spec=importlib.util.spec_from_file_location('spr',pathlib.Path(__file__).resolve().parents[1]/'convert-dasu-spr.py');spr=importlib.util.module_from_spec(spec);spec.loader.exec_module(spr)
want=set(GFX.values());found={};lists={}
monster_gfx={g for v in json.loads((pathlib.Path(__file__).with_name('client-monster-candidates.json')).read_text()).values() for g in v}-want
MONSTER_IDS={*range(8),*range(24,32)}
for idx in sorted(client.glob('Sprite*.idx')):
 b=idx.read_bytes();n=struct.unpack_from('<i',b)[0]
 if 4+n*28!=len(b):print('skip',idx.name);continue
 with open(idx.with_suffix('.pak'),'rb') as pak:
  for i in range(n):
   off,raw,size=struct.unpack_from('<i20si',b,4+i*28);name=raw.split(b'\0')[0].decode('latin1').lower()
   m=re.fullmatch(r'(\d+)-(\d+)\.spr',name)
   if (m and (int(m[1]) in want or (int(m[1]) in monster_gfx and int(m[2]) in MONSTER_IDS))) or name in('list.spr','wlist.spr') or re.fullmatch(r'list.*\.(spr|tbl|txt)',name):
    pak.seek(off&0xffffffff);data=pak.read(size)
    if m:found.setdefault(int(m[1]),{}).setdefault(int(m[2]),[]).append(idx.name);(out/'spr'/name).write_bytes(data)
    else:lists[name+'@'+idx.name]=data;(out/name).write_bytes(data);print('LIST',name,idx.name,size,data[:60].hex())
for k,g in GFX.items():
 s=found.get(g,{});print('GFX',k,g,'files',len(s),'ids',sorted(s)[:60])
for name,data in lists.items():
 for enc in('utf-8','big5','cp949','latin1'):
  try:text=data.decode(enc);break
  except UnicodeDecodeError:continue
 else:continue
 print('LISTHEAD',name,enc,repr(text[:200]))
 lines=text.split('\n');i=0;shown=0
 while i<len(lines):
  m=re.match(r'\s*#?(\d+)\s',lines[i])
  if m and int(m[1]) in want and shown<10:
   print('LISTENTRY',' | '.join(l.strip()[:150] for l in lines[i:i+12]));shown+=1
  i+=1
# Sheet: first frames of the first 8 ids for one character so action numbering can be read off.
for key,g in [('knight_m',61),('dark_f',2796)]:
 ids=sorted(found.get(g,{}))[:48];cell=120;sheet=Image.new('RGB',(cell*12,cell*max(1,(len(ids)+11)//12)),(40,50,40))
 for i,fid in enumerate(ids):
  try:
   frames,_,_=spr.decode(out/'spr'/f'{g}-{fid}.spr');f=frames[0];f.thumbnail((cell-4,cell-4));sheet.paste(f,(i%12*cell,i//12*cell),f)
   if i<16:print('FRAMES',g,fid,len(frames),frames[0].size)
  except Exception as e:print('DECODEFAIL',g,fid,repr(e)[:100])
 buf=io.BytesIO();sheet.save(buf,'JPEG',quality=55);b=base64.b64encode(buf.getvalue()).decode();print(f'PREVIEW-BEGIN {key}')
 for i in range(0,len(b),3000):print('B64 '+b[i:i+3000])
 print(f'PREVIEW-END {key}',flush=True)
