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
  // Standalone Cloudflare testing does not inherit Sites owner-only upload authorization.
  if (pathname.startsWith(UPLOAD)) return new Response('Asset upload disabled', { status: 403 });
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
