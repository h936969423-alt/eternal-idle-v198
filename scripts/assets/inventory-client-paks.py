"""List every .idx/.pak pair in a Lineage client folder without executing anything.

Usage: inventory-client-paks.py <client-root> <report-dir>

Writes:
  <report-dir>/pak-summary.txt   one line per index: format, entries, extension counts
  <report-dir>/pak-entries.tsv   index, name, offset, size (every entry)
  <report-dir>/pak-summary.json  machine-readable version of the summary
"""
import collections
import json
import pathlib
import struct
import sys

root, report = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
report.mkdir(parents=True, exist_ok=True)


def classic(data):
    """Classic index: int32 count, then count * (int32 offset, char[20] name, int32 size)."""
    if len(data) < 4:
        return None
    count = struct.unpack_from('<i', data)[0]
    if count < 0 or 4 + count * 28 != len(data):
        return None
    rows = []
    for i in range(count):
        off, raw, size = struct.unpack_from('<i20si', data, 4 + i * 28)
        rows.append((raw.split(b'\0')[0].decode('latin-1'), off & 0xFFFFFFFF, size))
    return rows


def describe(data):
    head = data[:8]
    if head.startswith(b'_EXTB$'):
        return 'extb'
    if head.startswith(b'_EXT'):
        return 'ext-' + head[:6].decode('latin-1', 'replace')
    return 'unknown'


summary = []
with open(report / 'pak-entries.tsv', 'w', encoding='utf-8') as tsv:
    tsv.write('index\tname\toffset\tsize\n')
    for idx in sorted(p for p in root.rglob('*') if p.is_file() and p.suffix.lower() == '.idx'):
        rel = idx.relative_to(root).as_posix()
        pak = next((p for p in idx.parent.iterdir() if p.stem.lower() == idx.stem.lower() and p.suffix.lower() == '.pak'), None)
        data = idx.read_bytes()
        rows = classic(data)
        item = {
            'index': rel,
            'idx_bytes': len(data),
            'pak': pak.relative_to(root).as_posix() if pak else None,
            'pak_bytes': pak.stat().st_size if pak else 0,
        }
        if rows is None:
            item.update(format=describe(data), entries=None, extensions={})
        else:
            ext = collections.Counter(n.rsplit('.', 1)[-1].lower() if '.' in n else '(none)' for n, _, _ in rows)
            beyond = sum(1 for _, off, size in rows if pak and off + size > item['pak_bytes'])
            item.update(format='classic', entries=len(rows), extensions=dict(ext.most_common()), out_of_range=beyond)
            for name, off, size in rows:
                tsv.write(f'{rel}\t{name}\t{off}\t{size}\n')
        summary.append(item)

with open(report / 'pak-summary.json', 'w', encoding='utf-8') as f:
    json.dump(summary, f, ensure_ascii=False, indent=1)
with open(report / 'pak-summary.txt', 'w', encoding='utf-8') as f:
    for s in summary:
        ext = ' '.join(f'{k}:{v}' for k, v in list(s['extensions'].items())[:12])
        f.write(f"{s['index']}\t{s['format']}\tentries={s['entries']}\tpak={s['pak_bytes'] / 1e6:.1f}MB\t{ext}\n")
print((report / 'pak-summary.txt').read_text(encoding='utf-8'))
print('INDEXES', len(summary), 'CLASSIC', sum(1 for s in summary if s['format'] == 'classic'))
