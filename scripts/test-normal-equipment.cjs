const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),vm=require('node:vm'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync('/tmp/normal-equipment-');
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
for(const name of ['gamedata.json','normal-equipment-reference.json','advanced-equipment-reference.json','rare-equipment-reference.json'])fs.copyFileSync(path.join(root,'lib/game',name),path.join(dir,name));
for(const name of ['loot-appearance','equipment-ranks','normal-equipment-migration','advanced-equipment-migration','rare-equipment-migration'])fs.writeFileSync(path.join(dir,name+'.js'),ts.transpileModule(fs.readFileSync(path.join(root,'lib/game',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);
// Historical appearance/parity checks read exact archived definitions for retired equipment.
const archived={...require(path.join(root,'lib/game/lineagew-retired.json')).items,...require(path.join(root,'lib/game/lineagew-hl-retired.json')).items},priorItems={...archived,...require(path.join(root,'lib/game/gamedata.json')).items};
async function main(){
 // Historic overrides remain readable, while new GM writes to retired IDs are rejected.
 const historicalPatch=(config,ids,patch)=>{for(const id of ids)if(archived[id]&&!require(path.join(root,'lib/game/gamedata.json')).items[id])assert.throws(()=>a.applyLootPatch(config,[id],patch),/有效物品/);return {...config,items:{...config.items,...Object.fromEntries(ids.map(id=>[id,{...config.items[id],...patch}]))}};};

 const a=require(path.join(dir,'loot-appearance')),m=require(path.join(dir,'normal-equipment-migration')),reference=require(path.join(dir,'normal-equipment-reference.json')),data=require(path.join(dir,'gamedata.json'));
 const old=a.initialLootAppearance();old.revision=12;old.items.ap381_weapon_1={name:'舊名稱',rarity:'hero',color:'#b366ff',effect:'text'};old.items.scroll_weapon={rarity:'legend',name:'自訂卷軸'};
 const snapshot=JSON.stringify(old),next=m.migrateNormalEquipmentConfig(old,1000);
 assert.equal(JSON.stringify(old),snapshot);assert.equal(next.revision,13);assert.equal(next.normalEquipmentVersion,1);
 assert.equal(next.items.ap381_weapon_1.name,'妖魔族匕首');assert.equal(next.items.ap381_weapon_1.color,'#b366ff');assert.equal(next.items.ap381_weapon_1.effect,'text');assert.deepEqual(next.items.scroll_weapon,old.items.scroll_weapon);
 for(const [id,row]of Object.entries(reference.items)){assert.equal(a.itemRarity(id),'normal');assert.equal(a.itemRarity(id+'@instance',next),'normal');assert.equal(a.itemDisplayName(id,next),row.name);assert.ok(['wpn','arm'].includes(priorItems[id].type));}
 const edited=historicalPatch(next,['ap381_weapon_1'],{name:'GM新名稱',rarity:'rare'});assert.equal(m.migrateNormalEquipmentConfig(edited),edited);assert.equal(a.itemRarity('ap381_weapon_1',edited),'rare');assert.equal(a.itemDisplayName('ap381_weapon_1',edited),'GM新名稱');
 assert.equal(a.itemRarity('ap381_weapon_61'),'mythic');assert.ok(!reference.items.ap381_weapon_41,'high-grade katana is not traditional katana');assert.ok(!reference.items.ap381_weapon_180,'crossbow not demoted by traditional crossbow');
 const baseline=JSON.parse(cp.execFileSync('git',['show','25e5b923bd0d175b343bd93935274d7130a152ff:lib/game/gamedata.json'],{cwd:root,maxBuffer:20e6}));
 assert.deepEqual(Object.keys(priorItems).filter(id=>!id.startsWith('lw_equipment_')&&!['lw_weapon_919276','lw_weapon_919284','lw_weapon_919283','lw_weapon_919278'].includes(id)).sort(),Object.keys(baseline.items).sort());for(const id of Object.keys(baseline.items)){const {n,...before}=baseline.items[id],{n:afterName,...after}=priorItems[id];assert.deepEqual(after,before,id);if(!reference.items[id]&&!require(path.join(dir,'advanced-equipment-reference.json')).items[id]&&!require(path.join(dir,'rare-equipment-reference.json')).items[id])assert.equal(afterName,n,id);}
 // Exercise the persistent store, including revision conflict retry and exact backup.
 let current={payload:snapshot,revision:12},backups=[],batches=0,failOnce=true;
 const db={prepare(sql){return {bind(...args){return {sql,args,async run(){return {meta:{changes:0}};},async first(){return {...current};}};}};},async batch(statements){batches++;const [backup,update]=statements;backups.push(backup.args);if(failOnce){failOnce=false;const concurrent=JSON.parse(current.payload);concurrent.items.scroll_weapon.name='並行更新';current={payload:JSON.stringify(concurrent),revision:13};return [{meta:{changes:1}},{meta:{changes:0}}];}assert.equal(update.args[3],current.revision);current={payload:update.args[0],revision:current.revision+1};return [{meta:{changes:1}},{meta:{changes:1}}];}};
 const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'lib/game/item-appearance-store.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:mod,exports:mod.exports,require:n=>n==='cloudflare:workers'?{env:{DB:db}}:n==='./loot-appearance'?a:n==='./normal-equipment-migration'?m:require(path.join(dir,n)),Date,JSON,Error});
 const persisted=await mod.exports.getLootAppearanceConfig();assert.equal(persisted.revision,14);assert.equal(persisted.items.scroll_weapon.name,'並行更新');assert.equal(backups[0][1],snapshot);assert.equal(batches,2);await mod.exports.getLootAppearanceConfig();assert.equal(batches,2,'migration runs exactly once');
 const settingsRows=['npcs','map_access','map_pools','monsters','dolls','world'].map(id=>({id,payload:'{}',revision:0}));settingsRows.push({id:'item_appearance',payload:snapshot,revision:12});
 let migratedReads=0;const settingsMocks={
  './item-appearance-store':{getLootAppearanceConfig:async()=>{migratedReads++;return next;}},
  './npc-config':{initialNpcConfig:()=>({})},'./map-access':{initialMapAccess:()=>({}),mapAccessState:x=>x},
  './loot-appearance':a,'./equipment381-settings':{equipment381Settings:x=>x},
  'cloudflare:workers':{env:{DB:{prepare:()=>({all:async()=>({results:settingsRows})})}}},
  './doll-config':{defaultDolls:()=>({})},'./world-rules':{DEFAULT_WORLD_RULES:{}}
 };
 const settingsMod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'lib/game/game-settings.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:settingsMod,exports:settingsMod.exports,require:n=>{assert.ok(n in settingsMocks,n);return settingsMocks[n];},Date,JSON,Error});
 const gameSettings=await settingsMod.exports.getGameSettings();assert.equal(migratedReads,1);assert.equal(gameSettings.appearance.items.ap381_weapon_1.name,'妖魔族匕首');assert.equal(gameSettings.appearance.revision,13);
 settingsRows.at(-1).payload=JSON.stringify({...next,advancedEquipmentVersion:1,rareEquipmentVersion:1});await settingsMod.exports.getGameSettings();assert.equal(migratedReads,1,'normal game polling avoids repeated migration reads');
 console.log('PASS: ordinary mapped items; instance IDs; exact name aliases; unchanged IDs/stats/assets; traditional separation; custom fields; later GM edits; backup; revision conflict retry; one-time migration.');
}
main().finally(()=>fs.rmSync(dir,{recursive:true,force:true})).catch(e=>{console.error(e);process.exitCode=1;});
