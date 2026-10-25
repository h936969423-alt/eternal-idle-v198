const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),Module=require('node:module');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'offline-check-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
const file=path.join(dir,'engine.js'),engine=require(file);
const baseline=new Module(file+'-baseline',module);baseline.filename=file;baseline.paths=Module._nodeModulePaths(dir);
baseline._compile(fs.readFileSync(file,'utf8').replace('exports.ADVANCE_BATCH_MS = 120_000;','exports.ADVANCE_BATCH_MS = 60000;').replace('exports.OFFLINE_EVENT_TAIL_MS = 4000;','exports.OFFLINE_EVENT_TAIL_MS = Infinity;'),file);
assert.equal(engine.ADVANCE_BATCH_MS,120000,'production retains CPU-bounded two-minute batches');
assert.equal(baseline.exports.ADVANCE_BATCH_MS,60000,'comparison uses independent one-minute batches');
assert.equal(baseline.exports.OFFLINE_EVENT_TAIL_MS,Infinity,'baseline must retain every visual event');
function gameplay(s){const copy=JSON.parse(JSON.stringify(s));for(const c of copy.characters)delete c.events;return copy;}
function rng(){let n=23;return()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};}
const realUUID=crypto.randomUUID;let uid=0;crypto.randomUUID=()=>`test-${uid++}`;
function save(){const s=engine.emptySave(1000000);for(const cls of ['knight','elf','mage']){const base=engine.BASES[cls],allocation={};let points=base.pts;for(const key of ['str','dex','con','int','wis','cha']){allocation[key]=Math.min(points,20-base[key]);points-=allocation[key];}engine.action(s,{type:'create',name:cls,cls,gender:'m',allocation},s.at);engine.action(s,{type:'run',value:true},s.at,()=>.5);const c=s.characters.at(-1);c.lv=60;c.attrs.str=40;c.attrs.con=40;c.gold=100000000;c.bag.potion_heal=100000;c.autoPotion=true;const b=engine.stats(c,s.at);c.hp=b.maxHp;c.mp=b.maxMp;}return s;}
try{
 const account=save();assert.equal(account.characters.filter(c=>c.running).length,1);
 const last=account.characters.at(-1),first=account.characters[0];
 engine.action(account,{type:'select',id:first.id},account.at);assert.equal(last.running,false);assert.equal(first.running,false);
 engine.action(account,{type:'run',value:true},account.at);assert.equal(first.running,true);assert.equal(last.running,false);
 engine.action(account,{type:'run',value:false},account.at);assert.equal(account.characters.filter(c=>c.running).length,0);
 engine.action(account,{type:'select',id:last.id},account.at);assert.equal(account.characters.filter(c=>c.running).length,0);
 const legacy=save();legacy.characters.forEach(c=>c.running=true);legacy.active=legacy.characters[1].id;
 engine.advance(legacy,legacy.at+60000,rng());assert.deepEqual(legacy.characters.filter(c=>c.running).map(c=>c.id),[legacy.active]);
 for(const c of legacy.characters)if(c.id!==legacy.active)assert.equal(c.kills,0,'legacy non-runner must not receive offline kills');
 assert.ok(legacy.characters[1].kills>0);
 const fallback=save();fallback.characters.forEach(c=>c.running=true);fallback.active='missing';engine.singleHunt(fallback);assert.deepEqual(fallback.characters.filter(c=>c.running).map(c=>c.id),[fallback.characters[0].id]);
 const initial=save(),full=structuredClone(initial),splitStart=structuredClone(initial),target=initial.at+480000;
 uid=0;const oldRandom=rng();let expected;do{expected=baseline.exports.advance(full,target,oldRandom);}while(expected.pendingSeconds);
 uid=0;let split=splitStart;const random=rng();let report,batches=0,maxMs=0;
 do{const at=split.at,t=performance.now();report=engine.advance(split,target,random);maxMs=Math.max(maxMs,performance.now()-t);assert.ok(split.at-at<=engine.ADVANCE_BATCH_MS);split.characters.forEach(c=>assert.ok(c.events.every(e=>e.at<=split.at)));split=JSON.parse(JSON.stringify(split));batches++;}while(report.pendingSeconds);
 assert.equal(batches,4);assert.deepEqual(gameplay(split),gameplay(full));assert.equal(report.seconds,expected.seconds);assert.equal(report.kills,expected.kills);assert.equal(report.gold,expected.gold);assert.equal(report.xp,expected.xp);assert.deepEqual(report.drops,expected.drops);assert.ok(report.xp>0);assert.equal(report.characterName,initial.characters.find(c=>c.running).name);assert.ok(Object.values(report.drops).every(n=>Number.isInteger(n)&&n>0));assert.equal(report.offline,true);
 assert.ok(full.characters.reduce((n,c)=>n+c.kills,0)>100,'fixture must exercise ongoing combat');
 const long=save(),oldLong=structuredClone(long);uid=0;const oldLongRng=rng();let oldReport;do{oldReport=baseline.exports.advance(oldLong,initial.at+43200000,oldLongRng);Object.assign(oldLong,JSON.parse(JSON.stringify(oldLong)));}while(oldReport.pendingSeconds);uid=0;const longRng=rng();let longReport,longBatches=0,longMs=0;do{const t=performance.now();longReport=engine.advance(long,initial.at+43200000,longRng);longMs=Math.max(longMs,performance.now()-t);longBatches++;}while(longReport.pendingSeconds);assert.deepEqual(gameplay(long),gameplay(oldLong));assert.equal(longReport.kills,oldReport.kills);assert.equal(longReport.gold,oldReport.gold);assert.equal(longReport.xp,oldReport.xp);assert.deepEqual(longReport.drops,oldReport.drops);assert.equal(longBatches,360);assert.equal(longReport.seconds,43200);assert.equal(long.at,initial.at+43200000);assert.ok(longMs<5000,'each accelerated batch must remain bounded');
 // Include pets, their legacy initialization, summoning, expiry, supplies and
 // random advancement. Only discarded visual snapshots may differ.
 const pet=require(path.join(dir,'pet-system.js')),initialParty=save(),mage=initialParty.characters.find(c=>c.cls==='mage');initialParty.characters.forEach(c=>c.running=false);initialParty.active=mage.id;mage.running=true;mage.attrs.cha=30;mage.attrs.wis=40;mage.petActives=['牧羊犬','貓','熊','杜賓狗'];mage.bag.scroll_revive=10000;mage.skills=['sk_summon'];mage.autoSkills=['sk_summon'];mage.mp=engine.stats(mage,initialParty.at).maxMp;
 for(const name of mage.petActives)pet.ensurePet(mage,name,initialParty.at);
 engine.cast(mage,'sk_summon',initialParty.at,rng());assert.ok(mage.summonContract.entities.length>0);mage.pets[mage.petActives[0]]={lv:10,xp:123,hit:2,damage:1};
 const partyOld=structuredClone(initialParty),partyFast=structuredClone(initialParty),partyEnd=initialParty.at+7200000;
 uid=0;const partyOldRng=rng();let partyOldReport,oldCalls=0;const oldStarted=performance.now();do{partyOldReport=baseline.exports.advance(partyOld,partyEnd,partyOldRng);oldCalls++;}while(partyOldReport.pendingSeconds);const oldMs=performance.now()-oldStarted;
 uid=0;const partyRng=rng();let partyReport,fastCalls=0,largestMs=0,partialEvents=0;const fastStarted=performance.now();do{const t=performance.now();partyReport=engine.advance(partyFast,partyEnd,partyRng);largestMs=Math.max(largestMs,performance.now()-t);fastCalls++;if(partyReport.pendingSeconds){partialEvents+=partyFast.characters.reduce((n,c)=>n+(c.events||[]).length,0);assert.ok(partyFast.characters.every(c=>!c.events.length),'intermediate catchup must not ship historical combat animations');}Object.assign(partyFast,JSON.parse(JSON.stringify(partyFast)));}while(partyReport.pendingSeconds);const fastMs=performance.now()-fastStarted;
 assert.equal(oldCalls,120);assert.equal(fastCalls,60);assert.equal(partialEvents,0);assert.deepEqual(gameplay(partyFast),gameplay(partyOld));assert.deepEqual(partyReport,partyOldReport);assert.ok(partyFast.characters.every(c=>c.events.every(e=>e.at>=partyEnd-engine.OFFLINE_EVENT_TAIL_MS)));
 const sync=require(path.join(dir,'state-sync.js')),mageNow=partyFast.characters.find(c=>c.id===mage.id),packet=sync.responseSave(partyFast,'0:0:0:0',{character:mage.id,after:mage.eventSeq||0,settingsKey:'0:0:0:0'});assert.equal(packet.sync.deltaCharacter,null,'large sequence gaps must replace the visual state');assert.equal(packet.save.characters.find(c=>c.id===mage.id).hp,mageNow.hp);
 const live=engine.advance(partyFast,partyFast.at+1000,partyRng);assert.equal(live.pendingSeconds,0);assert.ok(partyFast.characters.find(c=>c.id===mage.id).events.some(e=>e.at>partyEnd),'live combat resumes full event capture');
 console.log(`Party benchmark: previous ${oldMs.toFixed(1)} ms / ${oldCalls} calls, optimized ${fastMs.toFixed(1)} ms / ${fastCalls} calls, largest batch ${largestMs.toFixed(1)} ms; combat, pets, summons and rewards identical.`);
 const again=engine.advance(long,long.at,rng());assert.equal(again.seconds,0);assert.equal(again.kills,0);assert.equal(again.gold,0);assert.equal(again.xp,0);assert.deepEqual(again.drops,{});assert.equal(again.pendingSeconds,0);
 const cap={v:1,characters:[],active:null,at:0};assert.equal(engine.advance(cap,24*3600000).seconds,43200);assert.equal(cap.at,24*3600000);
 // Cap an old save once, then retain its cursor even as the wall clock moves.
 const idle=save();idle.characters.forEach(c=>c.running=false);idle.at=0;
 let r=engine.advance(idle,24*3600000);assert.equal(idle.at,12*3600000+engine.ADVANCE_BATCH_MS);assert.equal(r.pendingSeconds,43080);assert.equal(r.seconds,120);const cursor=idle.at;
 r=engine.advance(idle,24*3600000+60000);assert.equal(idle.at,cursor+engine.ADVANCE_BATCH_MS);assert.equal(r.seconds,240);
 do{r=engine.advance(idle,24*3600000+60000);Object.assign(idle,JSON.parse(JSON.stringify(idle)));}while(r.pendingSeconds);assert.equal(r.seconds,43200);assert.equal(idle.at,24*3600000,'catchup finishes the original frozen interval');r=engine.advance(idle,24*3600000+60000);assert.equal(r.seconds,60);assert.equal(r.pendingSeconds,0);assert.equal(idle.at,24*3600000+60000);
 const empty={v:1,characters:[],active:null,at:0};assert.equal(engine.advance(empty,43200000).pendingSeconds,0);
 console.log(`PASS: accelerated batches match previous exact combat and rewards; 12h cap applied once; max batch ${Math.max(maxMs,longMs).toFixed(1)} ms, 12h settled in ${longBatches} requests with identical rewards across batch sizes.`);
}finally{crypto.randomUUID=realUUID;fs.rmSync(dir,{recursive:true,force:true});}

