const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync('/tmp/afei-merge-');
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
for(const name of fs.readdirSync(path.join(root,'lib/game'))){const f=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(f,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText+(name==='engine.ts'?'\nexports.__award=award;':''));}
const load=n=>require(path.join(dir,n));
try{
 const e=load('engine'),pub=load('monster-loot'),cfg=load('monster-config'),boss=load('boss-loot'),preview=load('boss-drop-preview').bossDropPreview;
 const ref=require('../docs/afei-drops/reference-20261029.json'),now=Date.now();
 const source=JSON.parse(fs.readFileSync(path.join(root,'lib/game/gamedata.json'),'utf8')),hash=o=>require('node:crypto').createHash('sha256').update(JSON.stringify(o)).digest('hex');
 assert.equal(hash(Object.fromEntries(Object.entries(source.items).filter(([id])=>!ref.addedItems.includes(id)))),ref.preservation.existingItemsSha256,'existing equipment and item abilities are preserved');
 assert.equal(hash(Object.fromEntries(Object.entries(source).filter(([key])=>key!=='items'))),ref.preservation.otherGameDataSha256,'monster stats, maps, spells and world-boss definitions are preserved');
 for(const [id,entries] of Object.entries(ref.preservation.priorRates))for(const d of entries)assert.equal(pub.PUBLIC_DROP_RATES[id].find(row=>row.item===d.item)?.chance,d.chance,id+' retains existing rate for '+d.item);
 assert.equal(Object.keys(ref.mobs).length,220);assert.equal(Object.keys(ref.worldBosses).length,18);
 for(const [id,m] of Object.entries(ref.mobs)){
  assert.equal(cfg.defaultMonster(id).dropsMode,'original',id+' must use imported drops by default');
  const all=pub.publicMonsterDrop(id,()=>0,now).items.map(d=>d.item);
  for(const item of m.items){assert(e.DATA.items[item],id+': '+item);assert(all.includes(item),id+' reaches '+item);}
  assert.equal(new Set(pub.PUBLIC_DROP_RATES[id].map(d=>d.item)).size,pub.PUBLIC_DROP_RATES[id].length);
  assert.deepEqual(pub.PUBLIC_DROP_RATES[id],m.rates);
 }
 for(const item of ref.addedItems){const i=e.DATA.items[item];assert(i?.sourceIcon,item+' icon');assert(i.afeiOriginalId);}
 for(const [zone,b] of Object.entries(ref.worldBosses)){
  if(!load('boss-respawn').playableBoss(zone)){for(const item of b.items)assert(pub.WORLD_BOSS_LOOT[zone].includes(item));continue;}
  const shown=preview(zone,undefined,undefined,now);assert.equal(shown.equipment.length,0,'reference bosses do not replace equipment with a hybrid roll');
  for(const item of b.items){assert(boss.bossRoomDrops(zone).some(d=>d.item===item),zone+' table includes '+item);assert(shown.drops.some(d=>d.item===item),zone+' preview includes '+item);}
 }
 function make(zone){const b=e.BASES.knight,a={};let left=b.pts;for(const k of ['str','dex','con','int','wis','cha']){a[k]=Math.min(left,20-b[k]);left-=a[k];}const c=e.createCharacter('掉落整合','knight','m',a,now);c.zone=zone;e.ensureArena(c,()=>.5,now);return c;}
 // Real boss award path, not just a catalog: fixed rolls, receipt and inventory agree.
 for(const zone of Object.keys(ref.worldBosses)){
  if(!load('boss-respawn').playableBoss(zone))continue;
  const c=make(zone),members=c.arena.filter(m=>!m.summonedBy);
  for(const target of members){c.arenaTarget=c.arena.indexOf(target);target.hp=0;e.__award(c,target.id,()=>0,now);}
  assert(c.lastBossVictory,zone);assert.equal(c.lastBossVictory.drops.mat_boss_crystal,1,zone+' crystal exactly once');
  for(const item of ref.worldBosses[zone].items)assert(c.lastBossVictory.drops[item]>=1,zone+' actually grants '+item);
  const saved=JSON.stringify(c.bag);e.settleBossRewards(c,now,()=>0);assert.equal(JSON.stringify(c.bag),saved,zone+' receipt cannot be claimed twice');
 }
 // Ordinary imported equipment survives award; explicit GM empty custom tables stay empty.
 const c=make('training');c.arena=[{id:'orc',hp:0,maxHp:6,uid:'afei-test'}];c.arenaTarget=0;c.arenaZone=c.zone;
 e.__award(c,'orc',()=>0,now);const equipment=ref.mobs.orc.items.find(id=>['wpn','arm','acc'].includes(e.DATA.items[id].type));
 assert(Object.keys(c.bag).some(k=>k.split('@')[0]===equipment),'ordinary imported equipment reaches the bag');
 const custom=make('wb_sema');custom.bossRooms[custom.zone].dropDefinition={id:custom.zone,timing:'complete',drops:[]};custom.arena[0].hp=0;e.__award(custom,custom.arena[0].id,()=>.5,now);
 assert.deepEqual(custom.lastBossVictory.drops,{mat_boss_crystal:1},'empty GM table must not silently fall back');
 const multi=make('wb_twinwyvern');multi.bossRooms[multi.zone].dropDefinition={id:multi.zone,timing:'kill',drops:[{item:'scroll_weapon',chance:100,min:2,max:2,enabled:true}]};
 multi.arena[0].hp=0;e.__award(multi,multi.arena[0].id,()=>0,now);assert(!multi.lastBossVictory);assert(!multi.bag.scroll_weapon,'first member rewards are pending');
 multi.arenaTarget=1;multi.arena[1].hp=0;e.__award(multi,multi.arena[1].id,()=>0,now);assert.equal(multi.lastBossVictory.drops.scroll_weapon,4,'custom quantity and per-member timing preserved');
 console.log('PASS: 220 full monster tables, 18 boss tables and real awards, imported equipment, source icons, independent drops, GM override/quantity/timing, one crystal and exactly-once settlement.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
