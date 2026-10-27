import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
const sunriseMaps=JSON.parse(readFileSync(new URL('../lib/game/sunrise-maps.json',import.meta.url)));
const src=Object.values(sunriseMaps.files)[0].src;
const code=stripTypeScriptTypes(readFileSync(new URL('../lib/asset-storage.ts',import.meta.url),'utf8').replace(/^import .*;$/gm,'')).replaceAll('export ','');
const skillAssets=JSON.parse(readFileSync(new URL('../lib/game/lineagew-skill-assets.json',import.meta.url)));
const ctx=vm.createContext({sunriseMaps,skillAssets,config:{indexKey:'existing-index'},Request,Response,Headers,URL});vm.runInContext(code,ctx);
test('New map route serves only pinned R2 objects with JPEG headers, HEAD and ETag',async()=>{
  let calls=[];const body=new Uint8Array([255,216,255,217]);
  const bucket={async get(key){calls.push(key);return {size:body.length,body};},async head(key){calls.push(key);return {size:body.length};}};
  const res=await ctx.assetStorageFetch(new Request('https://game.test'+src),bucket);
  assert.equal(res.status,200);assert.equal(res.headers.get('content-type'),'image/jpeg');assert.deepEqual(new Uint8Array(await res.arrayBuffer()),body);
  assert.equal(calls[0],'sunrise-maps/v1/'+Object.values(sunriseMaps.files)[0].gitBlob+'.jpg');
  const head=await ctx.assetStorageFetch(new Request('https://game.test'+src,{method:'HEAD'}),bucket);
  assert.equal(await head.text(),'');assert.equal(head.headers.get('content-length'),'4');
  const cached=await ctx.assetStorageFetch(new Request('https://game.test'+src,{headers:{'if-none-match':res.headers.get('etag')}}),bucket);
  assert.equal(cached.status,304);assert.equal(calls.length,2);
});
test('Unknown paths and missing objects fail explicitly, existing upload remains disabled',async()=>{
  assert.equal((await ctx.assetStorageFetch(new Request('https://game.test/assets/sunrise-maps/unknown.jpg'),{get(){throw Error('must not fetch');}})).status,404);
  assert.equal((await ctx.assetStorageFetch(new Request('https://game.test'+src),{async get(){return null;}})).status,503);
  assert.equal((await ctx.assetStorageFetch(new Request('https://game.test/api/internal/asset-storage/test',{method:'POST'}),{})).status,403);
});
test('Skill images use their exact immutable pack range and cache tag',async()=>{
 const entry=Object.values(skillAssets.files)[0],body=readFileSync(new URL('../public'+entry.src,import.meta.url));let seen;
 const bucket={async get(key,options){seen={key,options};return {body};}};
 const res=await ctx.assetStorageFetch(new Request('https://game.test'+entry.src),bucket);
 assert.equal(res.status,200);assert.equal(res.headers.get('content-type'),'image/webp');assert.equal(res.headers.get('content-length'),String(body.length));assert.deepEqual(new Uint8Array(await res.arrayBuffer()),new Uint8Array(body));
 assert.equal(seen.key,'lw-skills/v1/'+skillAssets.packSha256);assert.equal(seen.options.range.offset,entry.offset);assert.equal(seen.options.range.length,entry.bytes);
 assert.equal((await ctx.assetStorageFetch(new Request('https://game.test'+entry.src,{headers:{'if-none-match':res.headers.get('etag')}}),bucket)).status,304);
 assert.equal((await ctx.assetStorageFetch(new Request('https://game.test/assets/lw-skills/unknown.webp'),bucket)).status,404);
});
