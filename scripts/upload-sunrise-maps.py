"""Upload verified immutable map objects to the existing isolated test R2 bucket."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib, importlib.util, json, subprocess
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('maps',ROOT/'scripts/restore-sunrise-maps.py')
maps=importlib.util.module_from_spec(spec);spec.loader.exec_module(maps)
manifest=json.loads((ROOT/'lib/game/sunrise-maps.json').read_text())
endpoint='https://9bf17726da5739f20d3e5ec454ae3d91.r2.cloudflarestorage.com'
bucket='eternal-idle-v198-test-assets'
def aws(*args):
    return subprocess.check_output(['aws','--endpoint-url',endpoint,*args],text=True)
def upload(entry):
    source=ROOT/'public'/entry['src'].lstrip('/')
    body=source.read_bytes();maps.verify(body,entry)
    sha=hashlib.sha256(body).hexdigest();key='sunrise-maps/v1/'+entry['gitBlob']+'.jpg'
    aws('s3','cp',str(source),'s3://'+bucket+'/'+key,'--content-type','image/jpeg','--metadata','sha256='+sha,'--no-progress','--only-show-errors')
    result=json.loads(aws('s3api','head-object','--bucket',bucket,'--key',key))
    assert result['ContentLength']==len(body) and result['Metadata']['sha256']==sha,key
    return len(body)
with ThreadPoolExecutor(max_workers=4) as pool:total=sum(pool.map(upload,manifest['files'].values()))
# Only strip static copies after every upload and metadata check has succeeded.
for entry in manifest['files'].values():
    target=ROOT/'dist/client'/entry['src'].lstrip('/')
    maps.verify(target.read_bytes(),entry);target.unlink()
print(f'Uploaded and verified {len(manifest["files"])} maps ({total} bytes) in isolated test R2; static copies removed')
