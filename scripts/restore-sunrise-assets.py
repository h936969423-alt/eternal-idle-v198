"""Restore and verify the immutable five-class icon and character assets."""
from pathlib import Path
import base64,hashlib,json
root=Path(__file__).resolve().parents[1]
manifest=json.loads((root/'assets/sunrise-five-v1.json').read_text())
for relative,entry in manifest['files'].items():
    path=Path(relative)
    assert relative.startswith('public/assets/sunrise-skills/') and path.suffix=='.png'
    assert '..' not in path.parts and not path.is_absolute()
    data=base64.b64decode(entry['base64'],validate=True)
    assert len(data)==entry['size'] and hashlib.sha256(data).hexdigest()==entry['sha256']
    assert data.startswith(b'\x89PNG\r\n\x1a\n')
    output=root/path;output.parent.mkdir(parents=True,exist_ok=True);output.write_bytes(data)
print('Verified five-class assets:',len(manifest['files']),'PNG files')
