"""Copy walk and idle sprite files for every graphic out of client Sprite paks. Nothing is executed.
Usage: script <client-dir> <out-dir>"""
import pathlib,re,struct,sys
client,out=pathlib.Path(sys.argv[1]),pathlib.Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True);n=0
for idx in sorted(client.glob('Sprite*.idx')):
 b=idx.read_bytes();count=struct.unpack_from('<i',b)[0]
 if 4+count*28!=len(b):print('skip',idx.name);continue
 with open(idx.with_suffix('.pak'),'rb') as pak:
  for i in range(count):
   off,raw,size=struct.unpack_from('<i20si',b,4+i*28);m=re.fullmatch(rb'(\d+)-(\d+)\.spr',raw.split(b'\0')[0].lower())
   if m and (int(m[2])<8 or 24<=int(m[2])<32):
    pak.seek(off&0xffffffff);(out/f'{int(m[1])}-{int(m[2])}.spr').write_bytes(pak.read(size));n+=1
print('EXTRACTED',n,'bytes',sum(p.stat().st_size for p in out.iterdir()),flush=True)
