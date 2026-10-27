"""Restore pinned original map JPEGs, checking Git blob identity and image dimensions."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path, PurePosixPath
from urllib.parse import quote
from urllib.request import Request, urlopen
import hashlib, json, struct, time

ROOT=Path(__file__).resolve().parents[1]

def dimensions(data):
    if not data.startswith(b'\xff\xd8'):
        raise ValueError('Expected JPEG')
    i=2
    while i<len(data):
        if data[i]!=255:
            raise ValueError('Invalid JPEG marker')
        while data[i]==255:i+=1
        marker=data[i];i+=1
        if marker in (0xD8,0xD9,0x01) or 0xD0<=marker<=0xD7:continue
        size=struct.unpack_from('>H',data,i)[0]
        if size<2 or i+size>len(data):raise ValueError('Invalid JPEG segment')
        if marker in (0xC0,0xC1,0xC2):
            height,width=struct.unpack_from('>HH',data,i+3)
            return width,height
        i+=size
    raise ValueError('No JPEG dimensions')

def verify(data,entry):
    digest=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
    if digest!=entry['gitBlob']:raise ValueError('Map source hash mismatch: '+entry['path'])
    if dimensions(data)!=(entry['width'],entry['height']):raise ValueError('Map dimensions mismatch: '+entry['path'])

def restore(manifest,entry):
    relative=PurePosixPath(entry['src'].removeprefix('/'))
    if '..' in relative.parts or not str(relative).startswith('assets/sunrise-maps/'):
        raise ValueError('Unsafe output path')
    target=ROOT/'public'/str(relative)
    if target.exists():
        verify(target.read_bytes(),entry)
        return target.stat().st_size
    url='https://raw.githubusercontent.com/'+manifest['repository']+'/'+manifest['commit']+'/'+quote(entry['path'],safe='/')
    for attempt in range(3):
        try:
            with urlopen(Request(url,headers={'User-Agent':'Eternal-map-build'}),timeout=60) as response:data=response.read()
            verify(data,entry)
            target.parent.mkdir(parents=True,exist_ok=True)
            target.write_bytes(data)
            return len(data)
        except Exception:
            if attempt==2:raise
            time.sleep(attempt+1)

def main():
    manifest=json.loads((ROOT/'lib/game/sunrise-maps.json').read_text())
    files=list(manifest['files'].values())
    allowed={e['src'] for e in files}
    assert all(z['src'] in allowed for z in manifest['zones'].values())
    with ThreadPoolExecutor(max_workers=4) as pool:
        total=sum(pool.map(lambda entry:restore(manifest,entry),files))
    print(f"Verified {len(files)} Sunrise map JPEGs (1920x1080), {total} bytes, {len(manifest['zones'])} mapped zones; source {manifest['commit']}",flush=True)

if __name__=='__main__':main()
