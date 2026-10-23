import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';

// Run after the game's normal build/asset selection, before packaging.
// Keep original source assets tracked; only remove verified externalized build output.
const root = process.cwd();
const output = path.join(root, '.asset-storage');
mkdirSync(output, { recursive: true });
const maxPack = 8 * 1024 * 1024;
const prefix = 'eternal-assets/v1/';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const types = { '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.json': 'application/json', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.mp4': 'video/mp4', '.webm': 'video/webm', '.bin': 'application/octet-stream', '.woff2': 'font/woff2' };
const files = {};
const objects = [];
let pack = [], size = 0, entries = [], totalBytes = 0;
function flush() {
  if (!pack.length) return;
  const body = Buffer.concat(pack), digest = hash(body), key = prefix + digest;
  writeFileSync(path.join(output, digest), body);
  objects.push({ key, sha256: digest, bytes: body.length });
  for (const [url, offset, length, type, sha256] of entries) files[url] = [key, offset, length, type, sha256];
  pack = []; size = 0; entries = [];
}
function walk(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name, 'en'))) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) { walk(file); continue; }
    const relative = path.relative(path.join(root, 'dist/client'), file).split(path.sep).join('/');
    // Generated JS/CSS and build metadata stay in the deployment.
    if (!existsSync(path.join(root, 'public', relative)) || !types[path.extname(file).toLowerCase()]) continue;
    const bytes = readFileSync(file);
    if (!bytes.length) continue;
    if (bytes.length > maxPack) throw new Error(`Asset needs streaming upload support: ${relative}`);
    if (size + bytes.length > maxPack) flush();
    entries.push(['/' + relative, size, bytes.length, types[path.extname(file).toLowerCase()], hash(bytes)]);
    pack.push(bytes); size += bytes.length; totalBytes += bytes.length;
  }
}
walk(path.join(root, 'dist/client/assets'));
flush();
if (!Object.keys(files).length) throw new Error('No built game assets found');
const manifest = Buffer.from(JSON.stringify({ version: 1, files }));
if (manifest.length > 10 * 1024 * 1024) throw new Error('Asset index exceeds upload budget');
const indexDigest = hash(manifest), indexKey = prefix + indexDigest;
writeFileSync(path.join(output, indexDigest), manifest);
objects.push({ key: indexKey, sha256: indexDigest, bytes: manifest.length });
writeFileSync(path.join(output, 'upload-plan.json'), JSON.stringify({ version: 1, indexKey, fileCount: Object.keys(files).length, totalBytes, objects }, null, 2) + '\n');
console.log(JSON.stringify({ indexKey, fileCount: Object.keys(files).length, totalBytes, objectCount: objects.length, manifestBytes: manifest.length }));
