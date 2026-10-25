"""Restore the checked-in immutable converted assets; never fetch executable content."""
from pathlib import Path
import hashlib,json,zipfile
root=Path(__file__).resolve().parents[1]
p=root/'assets/dasu-effects-v1.zip'
manifest=json.loads((root/'lib/game/dasu-asset-integrity.json').read_text())
parts=sorted((root/'assets').glob('dasu-v1.part[0-9][0-9]'))
if parts:p.write_bytes(b''.join(part.read_bytes() for part in parts))
assert hashlib.sha256(p.read_bytes()).hexdigest()==manifest['sha256'],'Effects pack hash mismatch'
out=root/'public/assets/dasu-v1';out.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(p) as z:
 assert set(z.namelist())==set(manifest['files'])
 for name,expected in manifest['files'].items():
  assert Path(name).name==name and not name.startswith('.')
  body=z.read(name);assert hashlib.sha256(body).hexdigest()==expected
  (out/name).write_bytes(body)
print('Verified imported effects:',len(manifest['files']),'files')
