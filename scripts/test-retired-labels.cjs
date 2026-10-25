const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const a=require('../lib/game/loot-appearance.ts'),data=require('../lib/game/gamedata.json');
const archived=require('../lib/game/lineagew-mythic-retirement-index.json').items;
for(const [id,item] of Object.entries(archived)){
 assert.equal(data.items[id],undefined,'archived labels must not reactivate retired equipment');
 assert.equal(a.itemDisplayName(id+'@copy'),item.n);
 assert.equal(a.itemRarity(id+'@copy'),'mythic');
 assert.throws(()=>a.applyLootPatch(a.initialLootAppearance(),[id],{name:'cannot reactivate'}),/有效物品/);
 const overrides={items:{[id]:{name:'保留自訂名稱',rarity:'hero'}}};
 assert.equal(a.itemDisplayName(id,overrides),'保留自訂名稱');assert.equal(a.itemRarity(id,overrides),'hero');
}
assert.equal(a.itemDisplayName('unknown_item'),'unknown_item');
console.log('PASS: retired names and mythic ranks remain readable; instance IDs and GM overrides preserved; retired gear stays unplayable.');
