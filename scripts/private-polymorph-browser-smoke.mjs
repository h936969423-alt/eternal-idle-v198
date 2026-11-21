import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import vm from 'node:vm'
import { chromium } from 'playwright'

const atlas = readFileSync(process.argv[2])
const forms = { fixture: { spriteId: 99999, actionTableId: 99999,
  actions: Object.fromEntries(['walk', 'attack', 'skill', 'death'].map(action =>
    [action, Object.fromEntries(Array.from({length: 8}, (_, direction) =>
      [direction, [[0, 0, 2], [0, 1, 2]]]))])) } }
function load(path, globals) {
  const code = stripTypeScriptTypes(readFileSync(path, 'utf8').replace(/^import .*;$/gm, ''))
    .replaceAll('export ', '')
  const context = vm.createContext(globals)
  vm.runInContext(code, context)
  return context
}
const resolver = load('lib/game/lineage-global-polymorph.ts', { forms })
const { assetStorageFetch } = load('lib/asset-storage.ts', {
  globalPolymorphAssetPrefix: resolver.globalPolymorphAssetPrefix,
  globalPolymorphAssetKeys: vm.runInContext('globalPolymorphAssetKeys', resolver),
  config: {}, sunriseMaps: {files: {}}, skillAssets: {files: {}}, Request, Response, Headers, URL,
})
const { ownsPrivatePolymorphSession } = load('lib/game/private-polymorph-session.ts', {
  digest: async value => value,
})
const token = 'a'.repeat(72)
const db = { prepare: () => ({ bind: (owner, hash) => ({
  first: async () => owner === 'smoke-owner' && hash === token ? {} : null,
}) }) }
let missing = false
const storage = {
  authorize: request => ownsPrivatePolymorphSession(request, db, 'smoke-owner'),
  bucket: {
    get: async () => missing ? null : { body: atlas, size: atlas.length },
    head: async () => missing ? null : { size: atlas.length },
  },
}
const server = createServer(async (request, response) => {
  if (request.url === '/') {
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.end('<canvas width="96" height="112"></canvas>')
    return
  }
  const result = await assetStorageFetch(new Request('http://localhost' + request.url, {
    method: request.method, headers: request.headers,
  }), undefined, storage)
  if (!result) {
    response.writeHead(404)
    response.end()
    return
  }
  response.writeHead(result.status, Object.fromEntries(result.headers))
  response.end(Buffer.from(await result.arrayBuffer()))
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = 'http://127.0.0.1:' + server.address().port
let browser
try {
  browser = await chromium.launch({headless: true})
  const page = await browser.newPage()
  await page.goto(origin)
  const sample = resolver.globalPolymorphFrame('fixture', 'walk', 0, 0)
  assert.equal((await page.request.get(origin + sample.src)).status(), 404)
  await page.context().addCookies([{name: 'game_session', value: 'b'.repeat(72), url: origin}])
  assert.equal((await page.request.get(origin + sample.src)).status(), 404)
  await page.context().addCookies([{name: 'game_session', value: token, url: origin}])
  const head = await page.request.head(origin + sample.src)
  assert.equal(head.status(), 200)
  assert.equal(head.headers()['cache-control'], 'private, no-store')
  async function play(frames) {
    return page.evaluate(async frames => {
      const canvas = document.querySelector('canvas')
      const ctx = canvas.getContext('2d')
      const pixels = []
      for (const frame of frames) {
        await new Promise(requestAnimationFrame)
        ctx.clearRect(0, 0, 96, 112)
        try {
          const image = new Image()
          image.src = frame.src
          await image.decode()
          ctx.drawImage(image, frame.x, frame.y, 96, 112, 0, 0, 96, 112)
        } catch {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, 96, 112)
        }
        pixels.push([...ctx.getImageData(48, 48, 1, 1).data])
      }
      return pixels
    }, frames)
  }
  for (const action of ['walk', 'attack', 'skill', 'death']) {
    for (let direction = 0; direction < 8; direction++) {
      const frames = [0, 1].map(index => resolver.globalPolymorphFrame('fixture', action, direction, index, 2))
      assert.deepEqual(await play(frames), [[32, 201, 151, 255], [255, 146, 43, 255]])
    }
  }
  missing = true
  assert.equal((await page.request.get(origin + sample.src)).status(), 404)
  assert.deepEqual(await play([sample]), [[255, 255, 255, 255]])
  console.log('Chromium decoded and drew both frames for 32 action/direction pairs. Missing object switched the probe to its fallback.')
} finally {
  await browser?.close()
  server.close()
}
