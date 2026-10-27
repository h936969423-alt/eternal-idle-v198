import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const sunrise=read('lib/game/sunrise-maps.json'),raw=read('lib/game/gamedata.json'),maps=read('lib/game/client-maps.json');
const code=readFileSync(new URL('../lib/game/scene-presentation.ts',import.meta.url),'utf8').match(/export function sceneBackground\(zone:string\)\{[^\n]+/)[0].replace('export ','').replace('zone:string','zone').replaceAll(/ as Record<string,\{src:string\}>| as Record<string,unknown>/g,'');
const context=vm.createContext({sunrise,raw,maps});vm.runInContext(code,context);
test('Every existing ordinary map and town resolves to a pinned Sunrise image',()=>{
  const zones=[...Object.values(raw.mapCategories).flat().map(x=>x.v),...Object.keys(raw.towns)];
  for(const zone of zones){assert.ok(sunrise.zones[zone],zone);assert.equal(context.sceneBackground(zone),sunrise.zones[zone].src);}
  assert.notEqual(context.sceneBackground('elf_forest'),context.sceneBackground('silver_knight'));
  assert.notEqual(context.sceneBackground('zone_28'),context.sceneBackground('zone_27'));
});
test('Floor groups, aliases and unmatched dragon maps stay explicit',()=>{
  assert.equal(sunrise.zones.town_gludio.asset,'燃柳村莊');
  assert.equal(sunrise.zones.pride_f9.asset,'傲慢之塔2~10樓');
  assert.equal(sunrise.zones.pride_f11.asset,'傲慢之塔11~20樓');
  for(const zone of sunrise.unmatched){assert.ok(!sunrise.zones[zone]);assert.equal(context.sceneBackground(zone),maps[zone]?.src||'/assets/background/forest.jpg');}
  assert.equal(context.sceneBackground('unknown_future_zone'),'/assets/background/forest.jpg');
});
test('All selected backgrounds exist in public assets and final deployment output',()=>{
  assert.match(sunrise.commit,/^[a-f0-9]{40}$/);
  const files=new Map(Object.values(sunrise.files).map(x=>[x.src,x]));
  for(const z of Object.values(sunrise.zones)){assert.ok(files.has(z.src),z.name);}
  for(const entry of files.values()){
    assert.equal(entry.src,'/assets/sunrise-maps/'+entry.gitBlob+'.jpg');
    assert.ok(existsSync(new URL('../public'+entry.src,import.meta.url)),entry.path);
    if(process.env.CHECK_BUILT_MAPS==='1')assert.ok(existsSync(new URL('../dist/client'+entry.src,import.meta.url)),entry.src);
  }
});
