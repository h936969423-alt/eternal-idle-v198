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

# Target-centered heavy spells use one composite atlas each.
pack=root/'assets/target-spells-v1.zip'
integrity=json.loads((root/'lib/game/target-spell-assets.json').read_text())
assert hashlib.sha256(pack.read_bytes()).hexdigest()==integrity['sha256']
with zipfile.ZipFile(pack) as z:
 assert set(z.namelist())==set(integrity['files'])
 dest=root/'public/assets/target-spells-v1';dest.mkdir(parents=True,exist_ok=True)
 for name,expected in integrity['files'].items():
  assert Path(name).name==name
  body=z.read(name);assert hashlib.sha256(body).hexdigest()==expected
  (dest/name).write_bytes(body)
print('Verified target spell atlases:',len(integrity['files']))
