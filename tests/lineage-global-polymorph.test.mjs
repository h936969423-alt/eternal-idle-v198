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
  const get = await assetStorageFetch(request(), bucket);
  assert.equal(get.status, 200);
  assert.equal(get.headers.get('content-type'), 'image/webp');
  assert.deepEqual(new Uint8Array(await get.arrayBuffer()), body);
  assert.equal((await assetStorageFetch(request(path, 'HEAD'), bucket)).body, null);
  assert.equal((await assetStorageFetch(request(path.replace('0.webp', '999.webp')), bucket)).status, 404);
  assert.equal((await assetStorageFetch(request(), { async get() { return null; } })).status, 404);
  assert.equal((await assetStorageFetch(request())).status, 503);
  assert.equal((await assetStorageFetch(request(), { async get() { throw new Error('R2 offline'); } })).status, 503);
});
