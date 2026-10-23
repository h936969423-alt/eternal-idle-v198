// Files are immutable SHA-256 addressed objects. The manifest is pinned per deployment.
import config from './asset-storage-config.json';

type Entry = [string, number, number, string, string];
type Index = { version: 1; files: Record<string, Entry> };
type Bucket = R2Bucket;
let cachedIndex: Promise<Index> | undefined;
const PREFIX = 'eternal-assets/v1/';
const UPLOAD = '/api/internal/asset-storage/';
const MAX_UPLOAD = 10 * 1024 * 1024;

function index(bucket: Bucket): Promise<Index> {
  if (!cachedIndex) cachedIndex = (async () => {
    const object = await bucket.get(config.indexKey!);
    if (!object) throw new Error('Asset index unavailable');
    const data = await object.json<Index>();
    if (data.version !== 1 || !data.files) throw new Error('Invalid asset index');
    return data;
  })().catch(error => { cachedIndex = undefined; throw error; });
  return cachedIndex;
}

export async function assetStorageFetch(request: Request, bucket?: Bucket): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;
  // This write endpoint relies on the Site's verified owner-only access policy.
  // Never make the Site public/shared without adding explicit upload authorization.
  if (pathname.startsWith(UPLOAD)) {
    // Standalone Cloudflare tests have no Sites owner-only upload policy.
    // Disable the mutation endpoint until explicit authenticated upload authorization is implemented.
    return new Response('Asset upload disabled in standalone test', { status: 403 });
    if (!bucket) return new Response('Storage unavailable', { status: 503 });
    if (request.method !== 'PUT') return new Response('Method not allowed', { status: 405 });
    const digest = pathname.slice(UPLOAD.length);
    if (!/^[a-f0-9]{64}$/.test(digest)) return new Response('Invalid object key', { status: 400 });
    const length = Number(request.headers.get('content-length'));
    if (!length || length > MAX_UPLOAD) return new Response('Invalid upload size', { status: 413 });
    const key = PREFIX + digest;
    if (await bucket.head(key)) return Response.json({ key, existing: true });
    const reader = request.body?.getReader();
    if (!reader) return new Response('Missing body', { status: 400 });
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_UPLOAD) { await reader.cancel(); return new Response('Upload too large', { status: 413 }); }
      chunks.push(chunk.value);
    }
    if (bytes !== length) return new Response('Length mismatch', { status: 400 });
    const body = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    const actual = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', body)), b => b.toString(16).padStart(2, '0')).join('');
    if (actual !== digest) return new Response('Checksum mismatch', { status: 400 });
    await bucket.put(key, body, { httpMetadata: { contentType: 'application/octet-stream' }, customMetadata: { sha256: digest } });
    return Response.json({ key, bytes, sha256: actual });
  }
  if (!pathname.startsWith('/assets/') || !config.indexKey || !['GET', 'HEAD'].includes(request.method)) return null;
  if (!bucket) return new Response('Asset storage unavailable', { status: 503 });
  let entry: Entry | undefined;
  try { entry = (await index(bucket)).files[decodeURIComponent(pathname)]; }
  catch { return new Response('Asset storage temporarily unavailable', { status: 503, headers: { 'Retry-After': '5' } }); }
  if (!entry) return null;
  const [key, base, total, contentType, sha256] = entry;
  const etag = '"' + sha256 + '"';
  const headers = new Headers({ 'Content-Type': contentType, 'ETag': etag, 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff', 'X-Asset-Storage': 'r2' });
  if ((request.headers.get('if-none-match') || '').split(',').map(s => s.trim().replace(/^W\//, '')).some(s => s === etag || s === '*')) return new Response(null, { status: 304, headers });
  let start = 0, end = total - 1, status = 200;
  const range = request.headers.get('range');
  const ifRange = request.headers.get('if-range');
  if (range && (!ifRange || ifRange === etag)) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!m || (!m[1] && !m[2])) { headers.set('Content-Range', `bytes */${total}`); return new Response(null, { status: 416, headers }); }
    if (m[1]) { start = Number(m[1]); end = m[2] ? Math.min(Number(m[2]), total - 1) : total - 1; }
    else { start = Math.max(0, total - Number(m[2])); }
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= total || end < start) { headers.set('Content-Range', `bytes */${total}`); return new Response(null, { status: 416, headers }); }
    status = 206;
    headers.set('Content-Range', `bytes ${start}-${end}/${total}`);
  }
  headers.set('Content-Length', String(end - start + 1));
  if (request.method === 'HEAD') return new Response(null, { status, headers });
  try {
    const object = await bucket.get(key, { range: { offset: base + start, length: end - start + 1 } });
    if (!object) throw new Error('Missing asset pack');
    return new Response(object.body, { status, headers });
  } catch { return new Response('Asset temporarily unavailable', { status: 503, headers: { 'Retry-After': '5' } }); }
}
