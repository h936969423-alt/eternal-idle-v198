from pathlib import Path
import hashlib,importlib.util,json,subprocess
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('restore',ROOT/'scripts/restore-lineagew-skills.py');restore=importlib.util.module_from_spec(spec);spec.loader.exec_module(restore)
m=json.loads((ROOT/'lib/game/lineagew-skill-assets.json').read_text());pack=bytearray()
for url,e in sorted(m['files'].items()):
 data=(ROOT/'public'/e['src'].lstrip('/')).read_bytes();restore.verify(data,e);assert len(pack)==e['offset'];pack.extend(data)
assert len(pack)==m['packBytes'] and hashlib.sha256(pack).hexdigest()==m['packSha256']
path=ROOT/'.asset-storage'/('lw-skills-'+m['packSha256']);path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(pack)
endpoint='https://9bf17726da5739f20d3e5ec454ae3d91.r2.cloudflarestorage.com';bucket='eternal-idle-v198-test-assets';key='lw-skills/v1/'+m['packSha256']
def aws(*args):return subprocess.check_output(['aws','--endpoint-url',endpoint,*args],text=True)
aws('s3','cp',str(path),'s3://'+bucket+'/'+key,'--metadata','sha256='+m['packSha256'],'--no-progress','--only-show-errors')
head=json.loads(aws('s3api','head-object','--bucket',bucket,'--key',key));assert head['ContentLength']==m['packBytes'] and head['Metadata']['sha256']==m['packSha256']
for e in m['files'].values():
 path=ROOT/'dist/client'/e['src'].lstrip('/');restore.verify(path.read_bytes(),e);path.unlink()
print(f'Uploaded verified skill pack: {len(m["files"])} WebPs, {m["packBytes"]} bytes; existing asset index unchanged')
