"""Upload prepared immutable asset packs. Credentials are supplied only through stdin."""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import sys
from urllib.parse import urlparse
from urllib.request import Request, build_opener, HTTPRedirectHandler

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs): return None

if sys.stdin.isatty():
    import termios
    flags = termios.tcgetattr(sys.stdin)
    flags[3] &= ~termios.ECHO
    termios.tcsetattr(sys.stdin, termios.TCSAFLUSH, flags)
print('Ready for upload credentials on stdin (input hidden).', flush=True)
settings = json.loads(sys.stdin.readline())
origin = settings['origin'].rstrip('/')
parsed = urlparse(origin)
if parsed.scheme != 'https' or not parsed.hostname.endswith('.chatgpt.site') or parsed.path or parsed.query:
    raise ValueError('Expected the selected Site HTTPS origin')
directory = Path('.asset-storage')
plan = json.loads((directory / 'upload-plan.json').read_text())

def upload(item):
    body = (directory / item['sha256']).read_bytes()
    if hashlib.sha256(body).hexdigest() != item['sha256'] or len(body) != item['bytes']:
        raise ValueError('Local object checksum mismatch')
    last = None
    for attempt in range(3):
        try:
            request = Request(origin + '/api/internal/asset-storage/' + item['sha256'],
                data=body, method='PUT', headers={
                    'OAI-Sites-Authorization': 'Bearer ' + settings['token'],
                    'Content-Type': 'application/octet-stream',
                    'Content-Length': str(len(body)),
                })
            response = build_opener(NoRedirect()).open(request, timeout=120)
            if response.status != 200:
                raise RuntimeError('Asset upload returned HTTP ' + str(response.status))
            result = json.loads(response.read())
            response.close()
            if result.get('key') != item['key'] or (not result.get('existing') and result.get('sha256') != item['sha256']):
                raise RuntimeError('Upload receipt mismatch')
            return item['bytes']
        except Exception as error:
            last = error
    raise last

# The index is published only after all immutable data packs exist.
packs = [item for item in plan['objects'] if item['key'] != plan['indexKey']]
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    for count, size in enumerate(pool.map(upload, packs), 1):
        print(json.dumps({'uploaded': count, 'packs': len(packs), 'bytes': size}), flush=True)
upload(next(item for item in plan['objects'] if item['key'] == plan['indexKey']))
(directory / 'upload-receipt.json').write_text(json.dumps({'indexKey': plan['indexKey'], 'objects': len(plan['objects']), 'verified': True}) + '\n')
print(json.dumps({'complete': True, 'files': plan['fileCount'], 'bytes': plan['totalBytes'], 'indexKey': plan['indexKey']}), flush=True)
