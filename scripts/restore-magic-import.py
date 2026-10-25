"""Restore only pinned spell frames, checking Git blob SHA and size before use."""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import time
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / 'lib/game/magic-import.json').read_text())
assert manifest['repository'] == 'pp771007/idle-lineage-class'
assert len(manifest['commit']) == 40 and all(c in '0123456789abcdef' for c in manifest['commit'])

def valid(body, entry):
    return len(body) == entry['size'] and hashlib.sha1(b'blob ' + str(len(body)).encode() + b'\0' + body).hexdigest() == entry['sha']

def restore(pair):
    relative, entry = pair
    parts = Path(relative).parts
    if '..' in parts or Path(relative).is_absolute() or not relative.endswith('.png'):
        raise ValueError('Unsafe spell frame path')
    dest = ROOT / 'public/assets/fx-import' / relative
    if dest.is_file() and valid(dest.read_bytes(), entry):
        return
    url = f"https://raw.githubusercontent.com/{manifest['repository']}/{manifest['commit']}/assets/fx/{quote(relative, safe='/')}"
    for attempt in range(4):
        try:
            with urlopen(Request(url, headers={'User-Agent': 'YongYe-spell-import'}), timeout=40) as response:
                body = response.read(entry['size'] + 1)
            if not valid(body, entry):
                raise ValueError('Spell frame hash mismatch: ' + relative)
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(body)
            return
        except Exception:
            if attempt == 3:
                raise
            time.sleep(attempt + 1)

if __name__ == '__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=24) as pool:
        for count, _ in enumerate(pool.map(restore, manifest['files'].items()), 1):
            if count % 200 == 0:
                print(f'Verified magic frames {count}/{len(manifest["files"])}', flush=True)
    print(f'Verified all {len(manifest["files"])} pinned magic frames', flush=True)
