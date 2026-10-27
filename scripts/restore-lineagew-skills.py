from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import urlopen,Request
import hashlib,json,time
ROOT=Path(__file__).resolve().parents[1]
def verify(data,e):
 if len(data)!=e['bytes'] or hashlib.sha256(data).hexdigest()!=e['sha256'] or data[:4]!=b'RIFF' or data[8:12]!=b'WEBP':raise ValueError('Skill image changed: '+e['url'])
def restore(e):
 path=ROOT/'public'/e['src'].lstrip('/')
 if path.exists():verify(path.read_bytes(),e);return
 assert e['url'].startswith('https://6sword.com/icons/lw/')
 for attempt in range(3):
  try:
   with urlopen(Request(e['url'],headers={'User-Agent':'Mozilla/5.0'}),timeout=60) as response:data=response.read()
   verify(data,e);path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data);return
  except Exception:
   if attempt==2:raise
   time.sleep(attempt+1)
def main():
 manifest=json.loads((ROOT/'lib/game/lineagew-skill-assets.json').read_text())
 with ThreadPoolExecutor(max_workers=6) as pool:list(pool.map(restore,manifest['files'].values()))
 print(f'Verified {len(manifest["files"])} original skill WebP images by SHA-256')
if __name__=='__main__':main()
