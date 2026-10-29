const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync('/tmp/boss-drop-preview-');
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
for(const name of fs.readdirSync(path.join(root,'lib/game'))){const f=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(f,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
const load=n=>require(path.join(dir,n));
try{
 const raw=load('gamedata.json'),preview=load('boss-drop-preview').bossDropPreview,boss=load('boss-respawn'),hybrid=load('hybrid-loot'),rank=load('loot-appearance'),e=load('engine');
 const base=e.BASES.knight,allocation={};let left=base.pts;for(const k of ['str','dex','con','int','wis','cha']){allocation[k]=Math.min(left,20-base[k]);left-=allocation[k];}
 const c=e.createCharacter('掉落驗證','knight','m',allocation,1000000),staff='lw_equipment_908934';let found,checked=0;
 for(const zone of Object.keys(raw.worldBosses).filter(boss.playableBoss)){
  c.zone=zone;e.ensureArena(c,()=>.5,1000000);
  const room=c.bossRooms[zone],lv=Math.max(...room.arena.map(m=>raw.mobs[m.id].lv)),rule=hybrid.defaultHybridRule(lv,hybrid.hybridRoleForBoss(zone)),pool=hybrid.hybridCandidates(rule,room.arena[0].id,zone,lv,undefined,1000000),view=preview(zone,c,undefined,1000000);
  if(load('four-dragon-loot').isFourDragonZone(zone)){assert.equal(view.dragonGroups.length,2);assert.equal(view.equipment.length,0);checked++;continue;}
  const shown=view.equipment.flatMap(g=>g.items.map(d=>d.item)).sort(),actual=Object.keys(pool).flatMap(r=>rule.weights[r]>0?pool[r]:[]).sort();assert.deepEqual(shown,load('afei-drops').isAfeiBoss(zone)?[]:actual,zone);if(load('afei-drops').isAfeiBoss(zone))assert(view.drops.length,zone+' reference drops are visible');
  if(!load('afei-drops').isAfeiBoss(zone))assert(!view.drops.some(d=>hybrid.isProgressionEquipment(raw.items[d.item])),'hybrid pool replaces fixed equipment');
  if(shown.includes(staff))found={zone,rule,pool,view};
  checked++;
 }
 // Fixed and custom hybrid sources must both show restored items, even in saved room snapshots.
 const zone=Object.keys(raw.worldBosses).find(z=>boss.playableBoss(z)&&!load('four-dragon-loot').isFourDragonZone(z));
 c.zone=zone;e.ensureArena(c,()=>.5,1000000);
 const blocked=Object.keys(raw.items).filter(id=>['hero','legend'].includes(rank.itemRarity(id))).slice(0,20);
 assert(blocked.length>0);
 for(const item of blocked){
  c.bossRooms[zone].dropDefinition={id:zone,timing:'complete',drops:[{item,enabled:true,chance:100,min:1,max:1}]};
  assert(preview(zone,c,undefined,1000000).drops.some(d=>d.item===item));
 }
 const rule=hybrid.defaultHybridRule(99,'world');
 c.bossRooms[zone].dropDefinition={id:zone,timing:'complete',drops:[],hybrid:{...rule,pool:'custom',equipmentIds:blocked}};
 assert(preview(zone,c,undefined,1000000).equipment.some(g=>['hero','legend'].includes(g.rank)));
 console.log('PASS: '+checked+' actual boss pools match preview with reference tables and restored custom rewards; custom pools, fixed drops and room snapshots');
}finally{fs.rmSync(dir,{recursive:true,force:true});}

