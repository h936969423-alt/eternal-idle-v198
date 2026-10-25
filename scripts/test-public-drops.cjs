const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText,file);
const {PUBLIC_DROP_RATES,AREA_DROP_RATES,publicMonsterDrop,rollPublicRates,areaMonsterDrops}=require('../lib/game/monster-loot.ts');
const {convertedDrops,validateDrops,rollConfiguredDrops}=require('../lib/game/monster-config.ts');
const data=require('../lib/game/gamedata.json');
const {specialSkillSupported}=require('../lib/game/combat-rules.ts');
assert.equal(specialSkillSupported('sk_elf_worldtree','passive'),true,'regional passive must be learnable');
assert.equal(Object.keys(PUBLIC_DROP_RATES).length,195);
// The 2026-10-20 non-equipment sync replaced retired catalog entries.
assert.equal(Object.values(PUBLIC_DROP_RATES).flat().length,1263);
assert.equal(Object.keys(AREA_DROP_RATES).length,4);
for(const [id,entries] of Object.entries(PUBLIC_DROP_RATES)){
 assert.ok(data.mobs[id],id);assert.equal(new Set(entries.map(d=>d.item)).size,entries.length,id);
 for(const d of entries){assert.ok(data.items[d.item],d.item);assert.ok(d.chance>=0&&d.chance<=100);}
 const converted=convertedDrops(id);validateDrops(converted);
 assert.deepEqual(converted.map(d=>({item:d.item,chance:d.chance})),entries);
}
assert.equal(publicMonsterDrop('orc',()=>0).items.length,4,'one kill can grant every independent drop');
assert.equal(publicMonsterDrop('orc',()=>.9).items.length,0);
assert.deepEqual(publicMonsterDrop('siege_ovi',()=>0),{known:true,items:[]},'empty published table must not use replacement loot');
assert.equal(publicMonsterDrop('missing_monster',()=>0).known,false);
const entries=[{item:'potion_heal',chance:25},{item:'potion_blue',chance:.025}];
assert.equal(rollPublicRates(entries,()=>.2499).length,1);
assert.equal(rollPublicRates(entries,()=>.25).length,0,'exact boundary is excluded');
assert.equal(rollPublicRates(entries,()=>.000249).length,2,'rare chance keeps decimal precision');
assert.equal(rollPublicRates(entries,()=>.00025).length,1);
assert.equal(rollPublicRates([{item:'potion_heal',chance:100}],()=>.9999,Date.now(),100).length,1,'bonus capped at 100%');
assert.equal(rollPublicRates([{item:'potion_heal',chance:0}],()=>0).length,0);
assert.equal(rollPublicRates([{item:'missing_item',chance:100}],()=>0).length,0);
assert.equal(areaMonsterDrops('zone_01',[],()=>.25).length,0);
assert.equal(areaMonsterDrops('zone_01',['sk_elf_worldtree'],()=>.25).length,3,'learned passive raises 20% to 30%');
assert.equal(areaMonsterDrops('zone_01',['sk_elf_worldtree'],()=>.3).length,0);
assert.equal(areaMonsterDrops('training',[],()=>0).length,0);
assert.equal(rollConfiguredDrops([{item:'potion_heal',chance:100,min:3,max:3,enabled:true}],0,()=>0)[0].quantity,3,'GM quantity rules preserved');
assert.equal(rollConfiguredDrops([{item:'potion_heal',chance:100,min:1,max:1,enabled:false}],0,()=>0).length,0,'disabled GM drops stay disabled');
const future=Object.entries(data.items).find(([,v])=>v.availFrom);
if(future)assert.equal(rollPublicRates([{item:future[0],chance:100}],()=>0,future[1].availFrom-1).length,0,'release-date gate preserved');
console.log('Passed: full ID mapping, rates, independent multi-drop, empty tables, boundaries, bonuses, regional passive, GM overrides and release-date gates.');

