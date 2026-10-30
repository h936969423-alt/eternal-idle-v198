const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),Module=require('node:module');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'offline-check-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
const e=require(path.join(dir,'engine.js')),g=require(path.join(dir,'offline-gains.js')),sync=require(path.join(dir,'state-sync.js'));
function fixture(level=60,zone='talking_island'){
 const s=e.emptySave(1_000_000),b=e.BASES.knight,allocation={};let left=b.pts;
 for(const k of ['str','dex','con','int','wis','cha']){allocation[k]=Math.min(left,20-b[k]);left-=allocation[k];}
 e.action(s,{type:'create',name:'離線測試',cls:'knight',gender:'m',allocation},s.at);
 const c=s.characters[0];c.lv=level;c.zone=zone;c.arenaZone=zone;c.arena=[];c.running=true;c.gold=0;c.xp=0;c.hp=e.stats(c,s.at).maxHp;return s;
}
try{
 // Regression: a RESIDENT monster survives an offline interval. Its clocks are seconds.
 const resident=fixture();e.ensureArena(resident.characters[0],()=>.5,resident.at);
 e.advance(resident,resident.at+60000,()=>.99);
 assert.equal(resident.characters[0].atkClock,0);assert.ok(resident.characters[0].arena.every(m=>m.clock===0));
 const serialized=JSON.parse(JSON.stringify(sync.persistedSave(resident)));const began=performance.now();
 e.advance(serialized,serialized.at+1000,()=>.5);assert.ok(performance.now()-began<1000);assert.ok(serialized.characters[0].events.length<=160);
 // Repair already persisted bad clocks without deleting characters, inventories or rewards.
 const broken=fixture();e.ensureArena(broken.characters[0],()=>.5,broken.at);const bc=broken.characters[0];
 bc.atkClock=bc.mobClock=1792910000000;for(const m of bc.arena){m.clock=1792910000000;m.magicClocks={test:1792910000000};}
 bc.gold=98765;bc.bag.potion_heal=1000;const gap=2,predicted=Math.floor((1-(gap-bc.arena[0].clock))/gap)+1;assert.ok(predicted>1e9,'old code would allocate billions of attacks');
 e.advance(broken,broken.at,()=>.5);assert.equal(bc.atkClock,0);assert.equal(bc.mobClock,0);assert.ok(bc.arena.every(m=>m.clock===0&&m.magicClocks.test===0));assert.equal(bc.gold,98765);assert.equal(bc.bag.potion_heal,1000);
 e.advance(broken,broken.at+1000,()=>.5);assert.ok(bc.arena.every(m=>m.clock>=0&&m.clock<86400));assert.ok(bc.events.length<=160);
 // CPU-limited ONLINE simulation resumes exactly; it must not become arithmetic offline income.
 const online=fixture();e.ensureArena(online.characters[0],()=>.5,online.at);const reference=structuredClone(online),finish=online.at+4000;
 const full=e.advance(reference,finish,()=>.5);
 let partial=e.advance(online,finish,()=>.5,undefined,0);assert.equal(partial.pendingSeconds,3);assert.equal(online.catchup.mode,'online');
 while(partial.pendingSeconds){const serialized=JSON.parse(JSON.stringify(sync.persistedSave(online)));Object.assign(online,serialized);partial=e.advance(online,finish,()=>.5,undefined,0);}
 assert.equal(online.at,finish);assert.equal(partial.offline,false);assert.equal(partial.gold,full.gold);assert.equal(partial.xp,full.xp);assert.deepEqual(JSON.parse(JSON.stringify(online.characters)),JSON.parse(JSON.stringify(reference.characters)));assert.equal(online.offlineIncome,undefined);
 // Exact arithmetic and VIP-free eligibility at/above the old paywall.
 for(const level of [1,39,40,60,99]){
  const s=fixture(level),c=s.characters[0],r=e.advance(s,s.at+3_600_000,()=>.99);
  assert.equal(r.xp,6000);assert.equal(r.gold,3000);assert.equal(c.gold,3000);assert.equal(r.pendingSeconds,0);assert.equal(s.catchup,undefined);
 }
 const start=performance.now();
 for(const hours of [24,48,2400]){
  const s=fixture(),r=e.advance(s,s.at+hours*3_600_000,()=>.99);
  assert.equal(r.seconds,86400);assert.equal(r.gold,72000);assert.equal(r.xp,144000);assert.equal(r.pendingSeconds,0);
  const stored=sync.persistedSave(s),receipt=structuredClone(s.offlineIncome),gold=s.characters[0].gold;
  const again=e.advance(stored,s.at,()=>0);assert.equal(again.gold,0);assert.equal(stored.characters[0].gold,gold);assert.deepEqual(stored.offlineIncome,receipt);
 }
 const elapsed=performance.now()-start;assert.ok(elapsed<2000,'long offline intervals must complete without duration-dependent simulation');
 const dead=fixture(60,'dragon_valley'),d=e.advance(dead,dead.at+3_600_000,()=>0);
 assert.equal(d.isDead,true);assert.equal(d.gold,0);assert.equal(dead.characters[0].running,false);assert.equal(dead.characters[0].zone,'town_silver_knight');assert.equal(dead.characters[0].deaths,1);assert.equal(dead.offlineIncome.isDead,true);
 const alive=fixture(60,'dragon_valley'),a=e.advance(alive,alive.at+3_600_000,()=>.99);assert.equal(a.isDead,false);assert.equal(a.gold,30000);assert.equal(a.xp,48000);
 // Five percent per hour means 1 - .95^24 over one day, not 120%.
 const rate=g.MAP_EFFICIENCY.dragon_valley,p=1-Math.pow(.95,24);
 assert.equal(g.calculateOfflineGains(86400,rate,()=>p-.00001).isDead,true);assert.equal(g.calculateOfflineGains(86400,rate,()=>p+.00001).isDead,false);
 for(const zone of ['town_talking','not_a_map','wb_sema']){const s=fixture(60,zone);const r=e.advance(s,s.at+3_600_000);assert.equal(r.gold,0);assert.equal(r.xp,0);assert.equal(r.pendingSeconds,0);}
 const closed=fixture();closed.characters[0].mapAccess={revision:1,closed:{talking_island:1},changes:{}};assert.equal(e.advance(closed,closed.at+3_600_000).gold,0);
 const stopped=fixture();stopped.characters[0].running=false;assert.equal(e.advance(stopped,stopped.at+3_600_000).gold,0);assert.equal(stopped.offlineIncome,undefined);
 const short=fixture(),small=e.advance(short,short.at+59000);assert.equal(small.gold,0);assert.equal(short.offlineIncome,undefined);
 const backward=fixture(),snapshot=JSON.stringify(backward);assert.equal(e.advance(backward,backward.at-1000).gold,0);assert.equal(JSON.stringify(backward),snapshot);
 // Already committed legacy catchup amounts must never be credited twice.
 const legacy=fixture();legacy.characters[0].gold=777;legacy.catchup={seconds:120,kills:7,gold:777,xp:33,drops:{arrow:2},characterId:legacy.active,characterName:legacy.characters[0].name,targetAt:legacy.at+120000};
 const lr=e.advance(legacy,legacy.at+120000,()=>.99);assert.equal(legacy.characters[0].gold,877);assert.equal(lr.gold,877);assert.equal(lr.xp,233);assert.deepEqual(lr.drops,{arrow:2});assert.equal(legacy.catchup,undefined);
 // Two requests start with one revision: the loser reloads the winner.
 const original=fixture(),end=original.at+3_600_000;let row={save:structuredClone(original),revision:0};
 const first=structuredClone(row),second=structuredClone(row);e.advance(first.save,end,()=>.99);e.advance(second.save,end,()=>.99);
 const commit=candidate=>{if(candidate.revision!==row.revision)return false;row={save:sync.persistedSave(candidate.save),revision:row.revision+1};return true;};
 assert.equal(commit(first),true);assert.equal(commit(second),false);const retry=structuredClone(row);assert.equal(e.advance(retry.save,end).gold,0);assert.equal(commit(retry),true);assert.equal(row.save.characters[0].gold,3000);
 // A second character receives none of the hunting character's income.
 const multi=fixture(),other=structuredClone(multi.characters[0]);other.id='other';other.name='other';other.running=false;multi.characters.push(other);e.advance(multi,multi.at+3_600_000);assert.equal(other.gold,0);assert.equal(multi.characters[0].gold,3000);
 const resumed=e.advance(multi,multi.at+1000,()=>.5);assert.equal(resumed.offline,false);assert.equal(resumed.pendingSeconds,0);assert.ok(multi.characters[0].events.some(x=>x.at===multi.at),'online combat resumes');
 const config=JSON.parse(fs.readFileSync(path.join(root,'wrangler.offline-test.json'),'utf8'));assert.deepEqual(config.triggers.crons,[]);
 assert.ok(!fs.readFileSync(path.join(root,'workers/offline-settler.ts'),'utf8').includes('DB.prepare'));
 console.log(`PASS: instant offline settlement, VIP-free levels, 24h cap, death distribution, exclusions, legacy receipts, CAS retry, online resume; three long intervals/retries ${elapsed.toFixed(1)} ms.`);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
