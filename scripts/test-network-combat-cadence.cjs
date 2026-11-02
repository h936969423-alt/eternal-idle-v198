const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const {enqueueSunriseReplay,drainCombatPresentation,applyCombatViewEvent}=require('../lib/game/combat-presentation.ts');
// The shipped regression rebased every reply and collapsed past events to now.
function broken(queue,fresh,now,previous){if(!fresh.length)return {queue,offset:previous};const anchor=Math.max(...fresh.map(e=>e.at)),offset=now-anchor;return {offset,queue:[...queue,...fresh.map(e=>({...e,due:Math.max(now,e.at+offset)}))].sort((a,b)=>a.due-b.due||a.seq-b.seq)};}
function simulate(enqueue){
 const events=[];let seq=0;for(let at=180;at<=45000;at+=180){events.push({seq:++seq,at,kind:'attack',source:'physical',hp:100,mp:100,damage:1,slot:0,uid:'mob'});if([3600,14400,25200].includes(at))events.push({seq:++seq,at,kind:'magic',manual:true,skill:'sk_shock_stun',effect:'狀態命中',hp:100,mp:90});}
 const latencies=[100,180,90,260,120,220],pending=[],shown=[],visuals=[];let queue=[],offset=null,cursor=0,start=0,packet=0,arrival=100;
 for(let now=0;now<=48000;now+=10){
  if(now>=arrival&&start<=46000){const fresh=[];while(cursor<events.length&&events[cursor].at<=start)fresh.push(events[cursor++]);const next=enqueue(queue,fresh,now,offset);queue=next.queue;offset=next.offset;start=arrival+Math.max(50,350-latencies[packet%latencies.length]);packet++;arrival=start+latencies[packet%latencies.length];}
  for(const e of drainCombatPresentation(queue,pending,now)){if(e.kind==='attack')shown.push({...e,displayed:now});if(e.visualOnly)visuals.push(now);}
 }
 return {shown,visuals};
}
const before=simulate(broken),after=simulate(enqueueSunriseReplay),gaps=x=>x.shown.slice(1).map((e,i)=>e.displayed-x.shown[i].displayed),old=gaps(before),fixed=gaps(after);
assert.ok(old.some(x=>x===0),'reproduce attacks collapsed into one received frame');assert.ok(Math.max(...old)>350);
assert.equal(after.shown.length,250);assert.equal(new Set(after.shown.map(e=>e.seq)).size,250);assert.ok(fixed.every(x=>x===180),JSON.stringify(fixed));assert.equal(after.visuals.length,3,'manual acknowledgements do not reset the normal timeline');
const base={seq:1,at:1000,kind:'magic',manual:true,skill:'lw_skill_400',hp:70,mp:20,slot:0,uid:'mob',targetEffects:{stun:{until:9000,value:1}}};
let q=enqueueSunriseReplay([],[base],5000,null),pending=[],v={hp:100,mp:100,arena:[{uid:'mob',id:'ant',hp:100}],floats:[]};let ready=drainCombatPresentation(q.queue,pending,5000);assert.equal(ready.length,1);v=applyCombatViewEvent(v,ready[0],5000);assert.equal(v.hp,100);assert.equal(v.mp,100);assert.equal(v.arena[0].effects,undefined);assert.equal(v.casts.length,1);
ready=drainCombatPresentation(q.queue,pending,5650);v=applyCombatViewEvent(v,ready[0],5650);assert.equal(v.hp,70);assert.equal(v.mp,20);assert.equal(v.arena[0].effects.stun.value,1);assert.equal(v.casts.length,1,'confirmed control effect displays once');
console.log(`PASS network cadence: reproduced ${Math.min(...old)}–${Math.max(...old)}ms burst/pause; 250 confirmed swings remain exactly 180ms apart through three manual casts and 90–260ms response jitter; one immediate effect with ordered HP/MP/status.`);
