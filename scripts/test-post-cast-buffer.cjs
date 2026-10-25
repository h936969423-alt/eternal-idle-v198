const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const {enqueueCombatReplay,drainCombatPresentation}=require('../lib/game/combat-presentation.ts');
// Reproduce the old permanent live-mode branch after a manual spell. Use the
// actual polling arrivals and actual drain routine for both implementations.
function oldEnqueue(queue,fresh,now,previous,live){
 if(!live)return enqueueCombatReplay(queue,fresh,now,previous);
 const offset=fresh.some(e=>e.manual)?now-Math.min(...fresh.filter(e=>e.manual).map(e=>e.at)):previous;
 return {offset,queue:[...queue.map(e=>({...e,due:e.due+offset-previous})),...fresh.map(e=>({...e,due:e.at+offset}))].sort((a,b)=>a.due-b.due||a.seq-b.seq)};
}
function simulate(enqueue){
 const latencies=[100,180,90,260,120,220],pending=[],shown=[],casts=[];let queue=[],offset=null,cursor=0,seq=0,start=0,packet=0,arrival=100,live=false;
 for(let now=0;now<=45000;now+=10){
  if(now>=arrival){const fresh=[];
   for(let at=cursor+100;at<=start;at+=100){
    if(at%1200===0)fresh.push({seq:++seq,at,kind:'attack',source:'physical',damage:10,slot:0,uid:'mob',hp:100,mp:100});
    if([3600,14400,25200].includes(at)){fresh.push({seq:++seq,at,kind:'magic',skill:'sk_meteor',manual:true,hp:100,mp:100});live=true;}
   }
   cursor=Math.floor(start/100)*100;
   const next=enqueue(queue,fresh,now,offset,live);queue=next.queue;offset=next.offset;
   if(fresh.some(e=>e.manual))assert.ok(queue.find(e=>e.manual&&fresh.some(x=>x.seq===e.seq)).due<=now,'manual casts remain immediate');
   start=arrival+Math.max(50,350-latencies[packet%latencies.length]);packet++;arrival=start+latencies[packet%latencies.length];
  }
  for(const e of drainCombatPresentation(queue,pending,now)){if(e.kind==='attack')shown.push({...e,displayed:now});if(e.manual)casts.push(now);}
 }
 for(let now=45010;now<=47000;now+=10)for(const e of drainCombatPresentation(queue,pending,now)){if(e.kind==='attack')shown.push({...e,displayed:now});if(e.manual)casts.push(now);}
 return {shown,casts};
}
const old=simulate(oldEnqueue),fixed=simulate(enqueueCombatReplay);
// Ignore the urgent frame and the following swing when measuring steady play.
const gaps=result=>result.shown.slice(1).flatMap((e,i)=>{const before=result.shown[i];return e.at>=6000&&!result.casts.some(t=>t>=before.displayed-1200&&t<=e.displayed)?[e.displayed-before.displayed]:[];});
const oldGaps=gaps(old),newGaps=gaps(fixed);
assert.ok(Math.max(...oldGaps)-Math.min(...oldGaps)>200,JSON.stringify(oldGaps));
assert.ok(newGaps.length>=20);assert.ok(newGaps.every(ms=>Math.abs(ms-1200)<=10),JSON.stringify(newGaps));
assert.equal(new Set(fixed.shown.map(e=>e.seq)).size,fixed.shown.length);assert.equal(fixed.shown.length,old.shown.length);assert.equal(fixed.casts.length,3);
console.log(`PASS: reproduced permanent post-cast jitter (${Math.min(...oldGaps)}–${Math.max(...oldGaps)}ms). Three immediate manual casts keep subsequent confirmed swings at ${Math.min(...newGaps)}–${Math.max(...newGaps)}ms under 90–260ms response jitter, with no missing/duplicate attacks.`);
