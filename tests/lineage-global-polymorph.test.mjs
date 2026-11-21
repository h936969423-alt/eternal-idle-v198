import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';

const load = (file, globals) => {
  const source = readFileSync(new URL('../' + file, import.meta.url), 'utf8');
  const code = stripTypeScriptTypes(source.replace(/^import .*;$/gm, ''))
    .replaceAll('export ', '');
  const context = vm.createContext(globals);
  vm.runInContext(code, context);
  return context;
};

const manifest = JSON.parse(readFileSync(new URL('../lib/game/lineage-global-polymorph.json', import.meta.url)));
const fixture = { morph_12: { spriteId: 56, actionTableId: 11328,
  actions: { attack: { 2: [[0, 0, 8], [0, 1, 8]] } } } };
const resolved = load('lib/game/lineage-global-polymorph.ts', { forms: fixture });
const path = '/assets/lineage-global/polymorph/56/0.webp';
const frame = () => resolved.globalPolymorphFrame('morph_12', 'attack', 2, 3, 4);

test('The shipped manifest keeps the original renderer active for all 51 forms', () => {
  const { forms } = JSON.parse(readFileSync(new URL('../lib/game/polymorph.json', import.meta.url)));
  const inactive = load('lib/game/lineage-global-polymorph.ts', { forms: manifest });
  assert.equal(forms.length, 51);
  for (const { id } of forms) {
    for (const action of ['idle', 'walk', 'attack', 'skill', 'hurt', 'death']) {
      for (let direction = 0; direction < 8; direction++) {
        assert.equal(inactive.globalPolymorphFrame(id, action, direction, 0), undefined);
      }
    }
  }
  assert.equal(resolved.globalPolymorphFrame('morph_12', 'skill', 2, 0), undefined);
  assert.equal(resolved.globalPolymorphFrame('morph_12', 'attack', 7, 0), undefined);
  assert.equal(frame().src, path);
  assert.equal(frame().x, 96);
});

test('The sprite hook falls back while loading, on image errors and for cropped cells outside the sheet', () => {
  let image;
  let ready;
  let effect;
  const hook = load('app/use-global-polymorph-frame.ts', {
    Image: class { constructor() { image = this; } },
    useEffect(callback) { effect = callback; },
    useState() { return [ready, value => { ready = value; }]; },
  });
  assert.equal(hook.useGlobalPolymorphFrame(frame()), undefined);
  const cleanup = effect();
  assert.equal(image.src, path);
  image.naturalWidth = 192;
  image.naturalHeight = 112;
  image.onload();
  assert.equal(hook.useGlobalPolymorphFrame(frame()).src, path);
  assert.equal(hook.useGlobalPolymorphFrame({ ...frame(), x: 192 }), undefined);
  assert.equal(hook.useGlobalPolymorphFrame({ ...frame(), src: path.replace('0.webp', '1.webp') }), undefined);
  image.onerror();
  assert.equal(hook.useGlobalPolymorphFrame(frame()), undefined);
  cleanup();
  assert.equal(image.onload, null);
});

test('A clip spanning two sheets waits for both and plays without falling back between frames', () => {
  const images = [];
  let ready;
  let effect;
  const hook = load('app/use-global-polymorph-frame.ts', {
    Image: class {
      naturalWidth = 96;
      naturalHeight = 112;
      constructor() { images.push(this); }
    },
    useEffect(callback) { effect = callback; },
    useState() { return [ready, value => { ready = value; }]; },
  });
  const first = { src: path, x: 0, y: 0 };
  const second = { ...first, src: path.replace('0.webp', '1.webp') };
  const sheets = [first.src, second.src].join(' ');
  const render = frame => hook.useGlobalPolymorphFrame({ ...frame, sheets });
  assert.equal(render(first), undefined);
  const cleanup = effect();
  assert.deepEqual(images.map(image => image.src), [first.src, second.src]);
  images[0].onload();
  assert.equal(render(first), undefined);
  images[1].onload();
  assert.equal(render(first).src, first.src);
  assert.equal(render(second).src, second.src);
  images[1].onerror();
  assert.equal(render(first), undefined);
  cleanup();
  assert.ok(images.every(image => image.onload === null && image.onerror === null));
});

test('The R2 route serves listed sheets and handles missing assets or storage', async () => {
  const [globalPolymorphAssetPrefix, globalPolymorphAssetKeys] =
    vm.runInContext('[globalPolymorphAssetPrefix, globalPolymorphAssetKeys]', resolved);
  const { assetStorageFetch } = load('lib/asset-storage.ts', {
    globalPolymorphAssetPrefix, globalPolymorphAssetKeys, config: {},
    sunriseMaps: {files: {}}, skillAssets: {files: {}}, Request, Response, Headers, URL,
  });
  const request = (pathname = path, method = 'GET') => new Request('https://game.test' + pathname, { method });
  const body = new Uint8Array([1, 2, 3]);
  const bucket = { async get() { return {body, size: body.length}; }, async head() { return {size: body.length}; } };
  const denyLegacy = { get() { throw new Error('must not read the legacy bucket'); } };
  const authorize = async req => req.headers.get('cookie') === 'game_session=fixture';
  const storage = { bucket, authorize };
  const owner = () => new Request('https://game.test' + path, { headers: { cookie: 'game_session=fixture' } });
  assert.equal((await assetStorageFetch(request(), denyLegacy, storage)).status, 404);
  assert.equal((await assetStorageFetch(owner(), denyLegacy)).status, 404);
  const get = await assetStorageFetch(owner(), denyLegacy, storage);
  assert.equal(get.status, 200);
  assert.equal(get.headers.get('content-type'), 'image/webp');
  assert.equal(get.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(new Uint8Array(await get.arrayBuffer()), body);
  const head = await assetStorageFetch(new Request(owner(), { method: 'HEAD' }), denyLegacy, storage);
  assert.equal(head.status, 200);
  assert.equal(head.body, null);
  assert.equal((await assetStorageFetch(request(path, 'POST'), denyLegacy, storage)).status, 405);
  assert.equal((await assetStorageFetch(request(path.replace('0.webp', '999.webp')), denyLegacy, storage)).status, 404);
  assert.equal((await assetStorageFetch(owner(), denyLegacy, { authorize })).status, 503);
  assert.equal((await assetStorageFetch(owner(), denyLegacy, { authorize, bucket: { async get() { return null; } } })).status, 404);
  assert.equal((await assetStorageFetch(owner(), denyLegacy, { authorize, bucket: { async get() { throw new Error('R2 offline'); } } })).status, 503);
});

test('Private polymorph sessions require the configured owner and a single valid cookie', async () => {
  const token = 'a'.repeat(72);
  const { ownsPrivatePolymorphSession } = load('lib/game/private-polymorph-session.ts', {
    digest: async value => 'hash:' + value,
  });
  const db = {
    prepare(sql) {
      assert.match(sql, /owner=\? AND session_hash=\? AND session_until>\?/);
      return { bind: (owner, hash, now) => ({
        first: async () => owner === 'owner' && hash === 'hash:' + token && now <= Date.now() ? {} : null,
      }) };
    },
  };
  const request = cookie => new Request('https://game.test' + path, { headers: { cookie } });
  assert.equal(await ownsPrivatePolymorphSession(request('game_session=' + token), db, 'owner'), true);
  assert.equal(await ownsPrivatePolymorphSession(request('game_session=' + token), db, 'other'), false);
  assert.equal(await ownsPrivatePolymorphSession(request('game_session=' + token), db), false);
  assert.equal(await ownsPrivatePolymorphSession(request('game_session=' + token + '; game_session=bad'), db, 'owner'), false);
  assert.equal(await ownsPrivatePolymorphSession(request('game_session=bad'), db, 'owner'), false);
});
