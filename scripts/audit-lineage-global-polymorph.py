"""Index existing decoded sprite sheets for offline review."""
import argparse
import base64
import csv
import hashlib
import io
import json
from pathlib import Path
import re
import zipfile

from PIL import Image


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('offline_atlas', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    with zipfile.ZipFile(args.offline_atlas) as archive:
        html = archive.read('lineage-polymorph-evidence-atlas.html').decode()

    scripts = dict(re.findall(r'<script id="([^"]+)"[^>]*>(.*?)</script>', html, re.S))
    data = json.loads(scripts['gpa-data'])
    game_forms = json.loads((Path(__file__).resolve().parents[1] / 'lib/game/polymorph.json').read_text())['forms']
    args.output.mkdir(parents=True, exist_ok=True)
    objects = {}
    with (args.output / 'crosswalk.csv').open('w', newline='', encoding='utf-8-sig') as handle:
        writer = csv.writer(handle)
        writer.writerow(['game_id', 'name', 'status', 'menu_id', 'menu_action', 'action_table', 'sprite_id', 'evidence'])
        for game_form in game_forms:
            matches = [form for form in data['forms'] if form['name'] == game_form['name']]
            variants = {(form['group'], form['gfx']) for form in matches}
            status = 'review' if len(variants) == 1 else 'ambiguous' if variants else 'unmatched'
            if not matches:
                writer.writerow([game_form['id'], game_form['name'], status])
            for match in matches:
                writer.writerow([game_form['id'], game_form['name'], status, match['id'], match['internal'],
                                 match['group'], match['gfx'], match['source']])

    pack_keys = sorted({match[1] for key in scripts
                        if (match := re.fullmatch(r'(?:gpa-img|clip)-(\d+-\d+)', key))})
    for sprite_id in sorted({form['gfx'] for form in data['forms']}):
        for pack in pack_keys:
            candidate_sprite, block = pack.split('-')
            if candidate_sprite != sprite_id:
                continue
            encoded = scripts.get(f'gpa-img-{pack}') or scripts.get(f'clip-{pack}')
            if not encoded:
                raise ValueError(f'Missing atlas sheet {pack}')
            payload = base64.b64decode(encoded.strip(), validate=True)
            if payload[:4] != b'RIFF' or payload[8:12] != b'WEBP':
                raise ValueError(f'Invalid WebP sheet {pack}')
            with Image.open(io.BytesIO(payload)) as image:
                image.load()
                width, height = image.size
                if image.mode != 'RGBA' or width % 96 or height % 112:
                    raise ValueError(f'Invalid RGBA atlas geometry {pack}')
            columns = data['packs'].get(pack, width // 96)
            if columns != width // 96:
                raise ValueError(f'Atlas column mismatch {pack}')
            key = f'lineage-global/polymorph/{sprite_id}/{block}.webp'
            path = args.output / key
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(payload)
            objects[key] = {'columns': columns, 'capacity': columns * (height // 112), 'size': len(payload), 'sha256': hashlib.sha256(payload).hexdigest()}

    unavailable = {}
    for form in data['forms']:
        group, sprite = form['group'], form['gfx']
        for action_id, _, directions, frames, _ in data['groups'][group]:
            for direction in directions:
                for block, cell, _ in frames:
                    key = f'lineage-global/polymorph/{sprite}/{block + direction}.webp'
                    if not 0 <= cell < objects.get(key, {}).get('capacity', 0):
                        unavailable.setdefault(f'{group}:{sprite}:{action_id}:{direction}', set()).add(key)
    index = {'source': 'LineageG_20251013', 'cellWidth': 96, 'cellHeight': 112, 'objects': objects,
             'forms': data['forms'], 'groups': data['groups'],
             'unavailableActionDirections': {k: sorted(v) for k, v in unavailable.items()}}
    (args.output / 'review-index.json').write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n')
    print(f"{len(game_forms)} game forms, {len(data['forms'])} atlas forms, {len(objects)} decoded sheets, {len(unavailable)} unavailable action directions")


if __name__ == '__main__':
    main()
