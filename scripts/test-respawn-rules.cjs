const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),Module=require('node:module');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'offline-check-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}

const engine=require(path.join(dir,'engine.js')),rules=require(path.join(dir,'respawn-rules.js')),pools=require(path.join(dir,'map-pools.js'));
const t=1000000;
function fixture(){const base=engine.BASES.knight,allocation={};let points=base.pts;for(const k of ['str','dex','con','int','wis','cha']){allocation[k]=Math.min(points,20-base[k]);points-=allocation[k];}const c=engine.createCharacter('測試','knight','m',allocation,t);c.lv=99;c.attrs.con=10000;c.hp=engine.stats(c,t).maxHp;c.autoPotion=false;c.buffs.status_stun={until:t+100000,d:{stun:1}};engine.ensureArena(c,()=>.5,t);c.running=true;return {v:1,at:t,characters:[c],active:c.id};}
function advance(s,ms){engine.advance(s,s.at+ms,()=>.5);}
try{
 const s=fixture(),c=s.characters[0];assert.equal(c.arena.length,3,'keep the current slot count');
 for(const zone of Object.keys(engine.DATA.maps)){c.zone=zone;assert.equal(rules.ordinaryRespawnMs(c,t),5000,zone);assert.equal(pools.mapGeneration(zone).count,3);}
 c.zone='training';c.buffs.sk_sunlight={until:t+20000,d:{light:1}};assert.equal(rules.ordinaryRespawnMs(c,t),4000);
 c.buffs.potion_haste={until:t+20000,d:{atkSpdPct:33}};assert.equal(rules.ordinaryRespawnMs(c,t),3000);
 c.poly={id:'morph_0',until:t+20000};assert.equal(rules.ordinaryRespawnMs(c,t),2300);assert.equal(rules.ordinaryRespawnMs(c,t+20000),5000,'expired buffs must not speed up respawn');
 c.buffs.fast={until:t+20000,d:{moveSpeedPct:10000}};assert.equal(rules.ordinaryRespawnMs(c,t),500);
 c.zone='antaras_lair';assert.equal(rules.ordinaryRespawnMs(c,t),500,'dragon caves follow the same speed rule');
 c.zone='training';const old={enabled:true,count:4,respawnSeconds:.6,entries:[{id:'arian',weight:1,enabled:true}]};c.mapPools={training:old};assert.equal(pools.mapGeneration('training',c.mapPools).respawnSeconds,5);assert.equal(pools.mapGeneration('training',c.mapPools).count,4);assert.strictEqual(pools.mapGeneration('training',c.mapPools).entries,old.entries);
 c.mapPools.training={...old,respawnRulesVersion:2,respawnSeconds:8};c.buffs={};delete c.poly;assert.equal(rules.ordinaryRespawnMs(c,t),8000,'new GM base timings remain editable');c.buffs.potion_haste={until:t+20000,d:{atkSpdPct:33}};assert.equal(rules.ordinaryRespawnMs(c,t),6000);
 const battle=fixture(),bc=battle.characters[0],survivors=bc.arena.slice(1).map(m=>m.uid),dead=bc.arena[0];dead.hp=0;delete dead.respawnAt;engine.ensureArena(bc,()=>.5,t);assert.equal(dead.respawnAt,t+5000);
 advance(battle,4900);assert.equal(bc.arena[0].hp,0);assert.deepEqual(bc.arena.slice(1).map(m=>m.uid),survivors);advance(battle,100);assert.ok(bc.arena[0].hp>0);assert.notEqual(bc.arena[0].uid,dead.uid);assert.deepEqual(bc.arena.slice(1).map(m=>m.uid),survivors);
 // Kill two slots at different times: replacing the first must not reset the second.
 bc.arena[0].hp=0;bc.arena[0].respawnAt=battle.at+5000;bc.arena[1].hp=0;bc.arena[1].respawnAt=battle.at+6000;const other=bc.arena[2].uid;
 advance(battle,5000);assert.ok(bc.arena[0].hp>0);assert.equal(bc.arena[1].hp,0);advance(battle,1000);assert.ok(bc.arena[1].hp>0);assert.equal(bc.arena[2].uid,other);
 const boss=fixture(),bossC=boss.characters[0];bossC.zone='wb_sema';engine.ensureArena(bossC,()=>.5,t);assert.equal(engine.populationSummary(bossC,t).respawnMs,3600000,'world boss timing unchanged');
 // Spawn mode persists through validation/serialization and drives actual replacements.
 const defaults=pools.defaultMapGeneration('training');assert.equal(defaults.spawnMode,'fixed');
 const fixed=pools.validateMapPool('training',{...defaults,spawnPoints:[{x:50,y:32},{x:70,y:52},{x:86,y:82}]});
 assert.deepEqual(pools.validateMapPool('training',JSON.parse(JSON.stringify(fixed))),fixed);
 for(const invalid of [{...fixed,spawnMode:'other'},{...fixed,spawnPoints:[{x:0,y:32},...fixed.spawnPoints.slice(1)]},{...fixed,spawnPoints:fixed.spawnPoints.slice(1)},{...fixed,spawnPoints:fixed.spawnPoints.map(()=>({x:60,y:50}))}])assert.throws(()=>pools.validateMapPool('training',invalid));
 const placement=fixture(),pc=placement.characters[0];pc.mapPools={training:fixed};pc.arena=[];engine.ensureArena(pc,()=>.5,t);assert.deepEqual(pc.arena.map(m=>m.spawnPoint),fixed.spawnPoints);
 const fixedUid=pc.arena[0].uid,still=pc.arena[1].uid;pc.arena[0].hp=0;pc.arena[0].respawnAt=t+5000;advance(placement,5000);assert.notEqual(pc.arena[0].uid,fixedUid);assert.deepEqual(pc.arena[0].spawnPoint,fixed.spawnPoints[0]);assert.equal(pc.arena[1].uid,still);
 pc.mapPools.training={...fixed,spawnMode:'random',count:6,spawnPoints:pools.defaultSpawnPoints(6)};pc.arena=[];engine.ensureArena(pc,()=>.5,placement.at);
 const positions=pc.arena.map(m=>({...m.spawnPoint}));assert.equal(new Set(positions.map(p=>JSON.stringify(p))).size,6);
 pc.arena[0].hp=0;pc.arena[0].respawnAt=placement.at+5000;advance(placement,5000);assert.notDeepEqual(pc.arena[0].spawnPoint,positions[0]);assert.deepEqual(pc.arena.slice(1).map(m=>m.spawnPoint),positions.slice(1),'survivors never move');
 for(let seed=1;seed<=100;seed++){let state=seed;const rng=()=>((state=(state*1664525+1013904223)>>>0)/4294967296),used=[];for(let slot=0;slot<6;slot++){const p=pools.chooseSpawnPoint({...fixed,spawnMode:'random'},slot,used,rng);assert.ok(p.x>=45&&p.x<=88&&p.y>=28&&p.y<=84);assert.ok(used.every(q=>Math.hypot(p.x-q.x,p.y-q.y)>=18));used.push(p);}}
 console.log(`PASS: fixed/random initial spawn and respawn, survivors, 100 randomized layouts, validation/serialization; all ${Object.keys(engine.DATA.maps).length} hunting maps use 5s base; same count/pool, independent slots, speed buffs/poly/expiry/floor, legacy GM migration, new GM timing and world-boss isolation.`);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
