import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const source = readFileSync(new URL('../lib/asset-storage.ts', import.meta.url), 'utf8').replace("import config from './asset-storage-config.json';", "const config = { indexKey: 'index' };");
const { assetStorageFetch } = await import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(source)).toString('base64'));
const content = Buffer.from('known asset bytes');
const sha = createHash('sha256').update(content).digest('hex');
const files = { '/assets/a.webp': ['pack', 7, content.length, 'image/webp', sha] };
const stored = new Map([['pack', Buffer.concat([Buffer.from('prefix!'), content, Buffer.from('suffix')])]]);
const bucket = {
  async get(key, options) {
    if (key === 'index') return { json: async () => ({ version: 1, files }) };
    let body = stored.get(key);
    if (!body) return null;
    if (options?.range) body = body.subarray(options.range.offset, options.range.offset + options.range.length);
    return { body: new Blob([body]).stream() };
  },
  async head(key) { return stored.has(key) ? {} : null; },
  async put(key, body) { stored.set(key, Buffer.from(body)); },
};
const req = (path = '/assets/a.webp', init) => new Request('https://example.test' + path, init);
let response = await assetStorageFetch(req(), bucket);
assert.equal(response.status, 200);
assert.deepEqual(Buffer.from(await response.arrayBuffer()), content);
for (const [range, expected, status] of [['bytes=2-5', content.subarray(2,6),206], ['bytes=-5',content.subarray(-5),206],['bytes=4-',content.subarray(4),206]]) {
  response = await assetStorageFetch(req(undefined, { headers: { range } }), bucket);
  assert.equal(response.status, status);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), expected);
}
for (const range of ['bytes=999-', 'bytes=5-2', 'bytes=-0', 'bytes=', 'bytes=0-2,5-8']) {
  response = await assetStorageFetch(req(undefined, { headers: { range } }), bucket);
  assert.equal(response.status, 416);
}
response = await assetStorageFetch(req(undefined, { headers: { 'if-none-match': '"' + sha + '"' } }), bucket);
assert.equal(response.status, 304);
response = await assetStorageFetch(req(undefined, { method: 'HEAD' }), bucket);
assert.equal(response.headers.get('content-length'), String(content.length));
assert.equal(await response.text(), '');
assert.equal(await assetStorageFetch(req('/api/game'), bucket), null);
assert.equal(await assetStorageFetch(req('/assets/unknown.png'), bucket), null);
const upload = '/api/internal/asset-storage/' + sha;
const beforeUpload = [...stored.entries()].map(([key, value]) => [key, Buffer.from(value)]);
response = await assetStorageFetch(req(upload, { method:'PUT', body:content, headers:{'content-length':String(content.length)} }), bucket);
assert.equal(response.status, 403, 'standalone Worker must never expose the owner-only upload API');
response = await assetStorageFetch(req('/api/internal/asset-storage/' + '0'.repeat(64), { method:'PUT', body:content, headers:{'content-length':String(content.length)} }), bucket);
assert.equal(response.status, 403);
response = await assetStorageFetch(req(upload, { method:'PUT', body:content, headers:{'content-length':String(11*1024*1024)} }), bucket);
assert.equal(response.status, 403);
for (const method of ['GET','HEAD','POST','DELETE']) {
  response = await assetStorageFetch(req(upload, {method}), bucket);
  assert.equal(response.status, 403, method);
}
assert.deepEqual([...stored.entries()], beforeUpload, 'denied uploads cannot alter R2');
console.log('Asset reads, exact pack offsets, ranges, HEAD, ETags, fallback and denied standalone uploads passed.');

