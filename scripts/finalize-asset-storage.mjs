import { createHash } from 'node:crypto';
import { existsSync, readFileSync, unlinkSync, readdirSync, mkdirSync, copyFileSync, renameSync } from 'node:fs';
import path from 'node:path';

export function finalizeAssetStorage() {
  if (process.env.ASSET_STORAGE_PREPARE === '1') return;
  const config = JSON.parse(readFileSync('lib/asset-storage-config.json', 'utf8'));
  if (!config.indexKey) return;
  const raw = readFileSync('lib/asset-storage-release.json');
  const digest = createHash('sha256').update(raw).digest('hex');
  if (config.indexKey !== 'eternal-assets/v1/' + digest) throw new Error('Asset release/index mismatch');
  const release = JSON.parse(raw);
  let removed = 0, bytes = 0;
  for (const [url, entry] of Object.entries(release.files)) {
    if (!url.startsWith('/assets/') || url.includes('..')) throw new Error('Invalid asset release path');
    const filename = path.resolve('dist/client', '.' + url);
    if (!existsSync(filename)) continue; // The current build may no longer select this frame.
    const body = readFileSync(filename);
    if (body.length !== entry[2] || createHash('sha256').update(body).digest('hex') !== entry[4]) {
      throw new Error(`External asset changed: ${url}. Prepare and upload a new release before publishing.`);
    }
    unlinkSync(filename); removed++; bytes += body.length;
  }
  // Stage a fresh tree instead of relying on deletions in an incremental build directory.
  // This also excludes legacy PNGs and unselected dragon groups copied by prior builds.
  const stamp = Date.now().toString(36);
  const stage = path.resolve('.asset-storage/publish-' + stamp);
  const input = path.resolve('dist');
  const selected = new Set(JSON.parse(readFileSync('dist/client/assets/dragon381/deployment-manifest.json', 'utf8')).groups);
  function copy(dir) {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      if (item.name === '.rsync-tmp') continue;
      const file = path.join(dir, item.name);
      const rel = path.relative(input, file).split(path.sep).join('/');
      if (rel.startsWith('client/assets/dragon381/sprites/')) {
        const group = rel.split('/')[4];
        if (!selected.has(group)) continue;
      }
      if (item.isDirectory()) { copy(file); continue; }
      if (release.files['/' + rel.replace(/^client\//, '')]) continue;
      if (rel.startsWith('client/assets/combat-anim/') && rel.endsWith('.png') && existsSync(path.resolve('public', rel.slice(7).replace(/\.png$/, '.webp')))) continue;
      const dest = path.join(stage, rel);
      mkdirSync(path.dirname(dest), { recursive: true });
      copyFileSync(file, dest);
    }
  }
  copy(input);
  renameSync(input, path.resolve('.asset-storage/unfiltered-' + stamp));
  renameSync(stage, input);
  console.log(`Independent asset storage: ${removed} verified files (${bytes} bytes) excluded from deployment.`);
}

