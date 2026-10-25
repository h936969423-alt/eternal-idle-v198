const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const {syncDelay,nextSyncDelay}=require('../lib/game/sync-policy.ts');
const {enqueueCombatReplay,drainCombatPresentation}=require('../lib/game/combat-presentation.ts');
assert.equal(syncDelay(true),350);assert.equal(nextSyncDelay(true,0,false,120),230);assert.equal(nextSyncDelay(true,0,false,800),50);
assert.equal(nextSyncDelay(false,0,false,120),6000);assert.equal(nextSyncDelay(true,1,false,120),1000);assert.equal(nextSyncDelay(true,0,true,120),500);
// Drive actual replay code with request start/response timestamps and confirmed attacks.
function simulate(delay,latencies){let cursor=0,seq=0,start=0,packet=0,arrival=latencies[0],queue=[],offset=null;const pending=[],shown=[];
 for(let now=0;now<=30000;now+=10){
  if(now>=arrival){const fresh=[];for(let at=cursor+100;at<=start;at+=100){if(at%1200===0)fresh.push({seq:++seq,at,kind:'attack',source:'physical',slot:0,uid:'mob',damage:10,mobHp:99999,hp:100,mp:0});}cursor=Math.floor(start/100)*100;
   const update=enqueueCombatReplay(queue,fresh,now,offset);queue=update.queue;offset=update.offset;
   const elapsed=latencies[packet%latencies.length];start=arrival+delay(elapsed);packet++;arrival=start+latencies[packet%latencies.length];
  }
  for(const e of drainCombatPresentation(queue,pending,now))if(e.kind==='attack')shown.push({seq:e.seq,at:now});
 }
 return shown;
}
const old=simulate(()=>3500,[100,180,90,260,120,220]);const fixed=simulate(ms=>nextSyncDelay(true,0,false,ms),[100,180,90,260,120,220]);
const gaps=hits=>hits.slice(1).map((e,i)=>e.at-hits[i].at);
assert.ok(Math.max(...gaps(old))>2000,'old 3.5s polling reproduces repeated batch gaps');
assert.ok(fixed.length>=20);assert.ok(Math.max(...gaps(fixed))<=1250,JSON.stringify(gaps(fixed)));
assert.equal(new Set(fixed.map(e=>e.seq)).size,fixed.length,'confirmed damage events render exactly once');
console.log('PASS: old repeated pause reproduced; 30 seconds of 1.2s attacks remain continuous under 90–260ms response jitter; latency-aware polling, idle/catch-up/backoff and one-time confirmed damage preserved.');
