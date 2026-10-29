import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import * as motion from '../lib/game/sunrise-player-motion.ts';
import * as hitSync from '../lib/game/local-hit-sync.ts';

const timing={counts:{idle:2,attack:4,skill:4,hurt:2,death:4},attackSeconds:.4,castSeconds:.4};
function harness(){
 let now=0,index=0,nextId=0,slots=[],pending=[],calls=[],props={identity:'one:zone',cues:[],timing,hp:100,intent:undefined,local:{running:true,hasTarget:true,blocked:false}};
 const timers=new Map(),listeners=new Map(),document={hidden:false,addEventListener:(k,v)=>listeners.set(k,v),removeEventListener:k=>listeners.delete(k)};
 const context={document,performance:{now:()=>now},Set,...motion,...hitSync,
  triggerSunriseMotion:(state,kind,at,t)=>{calls.push({kind,at});return motion.triggerSunriseMotion(state,kind,at,t);},
  useRef:value=>{const i=index++;return slots[i]??=( {current:value});},
  useState:value=>{const i=index++;slots[i]??={value};return [slots[i].value,v=>{slots[i].value=typeof v==='function'?v(slots[i].value):v;}];},
  useEffect:(fn,deps)=>{const i=index++,old=slots[i];if(!old||deps.some((v,j)=>!Object.is(v,old.deps[j])))pending.push(()=>{old?.cleanup?.();slots[i]={deps:[...deps],cleanup:fn()};});},
  setInterval:(fn,ms)=>{const id=++nextId;timers.set(id,{fn,ms,next:now+ms});return id;},clearInterval:id=>timers.delete(id)};
 const source=stripTypeScriptTypes(fs.readFileSync(new URL('../app/use-sunrise-player-motion.ts',import.meta.url),'utf8')).replace(/^import .*;\s*$/gm,'').replace('export function useSunrisePlayerMotion','function useSunrisePlayerMotion');
 vm.createContext(context);vm.runInContext(source+'\nthis.hook=useSunrisePlayerMotion;',context);
 const render=(patch={})=>{props={...props,...patch};index=0;const p=props;context.hook(p.identity,p.cues,p.timing,p.hp,p.intent,p.local);const effects=pending;pending=[];effects.forEach(fn=>fn());};
 const advance=target=>{while(true){let next=Infinity;for(const t of timers.values())next=Math.min(next,t.next);if(next>target)break;now=next;for(const [id,t]of [...timers])if(t.next===now&&timers.has(id)){t.next+=t.ms;t.fn();}}now=target;};
 render();return {render,advance,calls,timers,slots,hide:hidden=>{document.hidden=hidden;listeners.get('visibilitychange')?.();},unmount:()=>{for(const s of slots)s?.cleanup?.();},pose:()=>slots.find(s=>s?.value&&typeof s.value==='object'&&'kind' in s.value)?.value};
}
test('local attack and manual/automatic cast publish their first pose without waiting for the 125ms sampler',()=>{
 const h=harness();h.advance(400);assert.equal(h.pose().kind,'attack');assert.equal(h.pose().frame,0);
 h.advance(410);h.render({intent:{id:1,at:410,characterId:'one',skill:'spell'}});
 assert.equal(h.pose().kind,'skill');assert.equal(h.pose().frame,0);
 h.advance(900);h.render({cues:[{seq:1,kind:'skill',key:'auto',displayAt:900}]});
 assert.equal(h.pose().kind,'skill');assert.equal(h.pose().frame,0);h.unmount();
});
test('automatic casts use the effect start clock and late history cannot restart an expired pose',()=>{
 const h=harness();h.advance(1000);h.render({cues:[{seq:1,kind:'skill',key:'auto',displayAt:850}]});
 assert.equal(h.pose().kind,'skill');assert.equal(h.pose().frame,1);
 h.advance(1700);const before=h.calls.filter(c=>c.kind==='skill').length;
 h.render({cues:[{seq:2,kind:'skill',key:'stale',displayAt:1000}]});
 assert.equal(h.calls.filter(c=>c.kind==='skill').length,before);h.unmount();
});
test('casting over an uncontacted swing retains one attack, but a completed contact is never replayed',()=>{
 // At 0.8s / 4 frames the midpoint is 1200ms, sampled at 1250ms.
 // 1150ms is still uncontacted under Afei's full-interval frame clock.
 for(const at of [810,1150,1300]){
  const h=harness(),ownerKey=`cast-interrupt:${at}`;
  h.render({identity:ownerKey,timing:{...timing,attackSeconds:.8},local:{running:true,hasTarget:true,blocked:false,ownerKey,targetUid:'A',liveTargetUids:['A']}});
  h.advance(at);h.render({intent:{id:1,at,characterId:'one',skill:'spell'}});
  assert.equal(h.slots[0].current.pendAtk,at<1250,'only an interrupted, uncontacted swing needs a handoff');
  if(at===810){h.advance(1250);assert.equal(h.pose().kind,'attack');assert.equal(h.slots[0].current.pendAtk,false);}
  h.unmount();
 }
});
test('100ms progress preserves fractional periods and speed-change progress',()=>{
 for(const period of [.1,.19,.4489,.8,1.3,2.5]){
  let clock={elapsed:0,period},attacks=0;
  for(let i=0;i<600;i++){const next=motion.tickLocalPlayerAttack(clock,period,true);clock=next.clock;attacks+=Number(next.attack);}
  assert.equal(attacks,Math.floor((60+1e-9)/period));
 }
 const next=motion.tickLocalPlayerAttack({elapsed:.4,period:.8},.4,true);
 assert.ok(Math.abs(next.clock.elapsed-.3)<1e-9);assert.equal(next.attack,false);
 assert.equal(motion.tickLocalPlayerAttack(next.clock,.4,false).clock.elapsed,0);
});
test('skill keeps exactly one pending swing and supplements it after completion',()=>{
 let s=motion.triggerSunriseMotion(motion.emptySunriseClock(),'skill',0,timing);
 for(const at of [100,200,300])s=motion.triggerSunriseMotion(s,'attack',at,timing);
 assert.equal(s.pendAtk,true);assert.equal(motion.advanceSunriseMotion(s,399,timing).act,'skill');
 s=motion.advanceSunriseMotion(s,400,timing);assert.equal(s.act,'attack');assert.equal(s.pendAtk,false);assert.equal(s.t,400);
 assert.equal(motion.advanceSunriseMotion(s,800,timing).act,null);
});
test('no packets are needed for local swings; packet bursts do not reset or duplicate them',()=>{
 const h=harness();assert.deepEqual([...h.timers.values()].map(t=>t.ms),[100,125]);
 h.advance(1050);assert.deepEqual(h.calls.map(c=>c.at),[400,800]);
 const ids=[...h.timers.keys()];h.render({cues:[1,2,3,4].map(seq=>({seq,kind:'attack',key:String(seq)}))});
 assert.equal(h.calls.length,2);assert.deepEqual([...h.timers.keys()],ids);
 h.advance(1200);assert.deepEqual(h.calls.map(c=>c.at),[400,800,1200]);h.unmount();assert.equal(h.timers.size,0);
});
test('manual cast confirmation plays once; stop clears pending attacks',()=>{
 const h=harness();h.advance(100);h.render({intent:{id:1,at:100,characterId:'one',skill:'spell'}});
 h.render({cues:[{seq:1,kind:'skill',key:'spell',previewAt:100}]});
 h.advance(400);assert.equal(h.calls.filter(c=>c.kind==='skill').length,1);assert.equal(h.slots[0].current.pendAtk,true);
 h.render({local:{running:false,hasTarget:true,blocked:false}});assert.equal(h.slots[0].current.pendAtk,false);
 h.advance(1500);assert.equal(h.calls.filter(c=>c.kind==='attack').length,1);h.unmount();
});
test('no target, control effects, death and hidden tabs suppress attacks without catch-up bursts',()=>{
 for(const patch of [{local:{running:true,hasTarget:false,blocked:false}},{local:{running:true,hasTarget:true,blocked:true}},{hp:0}]){
  const h=harness();h.render(patch);h.advance(2000);assert.equal(h.calls.filter(c=>c.kind==='attack').length,0);h.unmount();
 }
 const h=harness();h.advance(300);h.hide(true);h.advance(10000);assert.equal(h.calls.length,0);
 h.hide(false);h.advance(10300);assert.equal(h.calls.length,0);h.advance(10400);assert.equal(h.calls.length,1);h.unmount();
});
test('the real 125ms motion sampler releases HP only at its displayed contact frame',()=>{
 const h=harness(),ownerKey='sampler:zone';
 h.render({identity:ownerKey,local:{running:true,hasTarget:true,blocked:false,ownerKey,targetUid:'mob'}});
 h.advance(624);assert.equal(hitSync.allowLocalHit(ownerKey,'mob',1,624),false);
 h.advance(625);assert.equal(hitSync.allowLocalHit(ownerKey,'mob',1,625),true);
 assert.equal(hitSync.allowLocalHit(ownerKey,'mob',2,625),false);
 h.unmount();assert.equal(hitSync.allowLocalHit(ownerKey,'mob',3,626),true);
});
test('changing selection during a swing cannot redirect its contact to another monster',()=>{
 const h=harness(),ownerKey='mid-swing:zone';
 h.render({identity:ownerKey,local:{running:true,hasTarget:true,blocked:false,ownerKey,targetUid:'left',targetSlot:0,liveTargetUids:['left','right']}});
 hitSync.queueLocalHitTargets(ownerKey,[{seq:1,kind:'attack',uid:'left',slot:0}]);
 h.advance(450);
 h.render({local:{running:true,hasTarget:true,blocked:false,ownerKey,targetUid:'right',targetSlot:1,liveTargetUids:['left','right']}});
 hitSync.queueLocalHitTargets(ownerKey,[{seq:2,kind:'attack',uid:'right',slot:1}]);
 h.advance(625);assert.equal(hitSync.allowLocalHit(ownerKey,'right',2,625),false);assert.equal(hitSync.allowLocalHit(ownerKey,'left',1,625),true);
 h.advance(1025);assert.equal(hitSync.allowLocalHit(ownerKey,'right',2,1025),true);h.unmount();
});
test('incoming hits from five monsters cannot starve normal attack contacts',()=>{
 const h=harness(),ownerKey='five-incoming:zone';
 h.render({identity:ownerKey,local:{running:true,hasTarget:true,blocked:false,ownerKey,targetUid:'mob',liveTargetUids:['mob']}});
 let landed=0;
 for(let at=100;at<=3000;at+=25){
  h.advance(at);
  if(at%100===0)h.render({hp:100-at/100});
  if(hitSync.allowLocalHit(ownerKey,'mob',landed+1,at))landed++;
 }
 assert.ok(landed>=5,`only ${landed} visible contacts in 3 seconds`);
 h.unmount();
});
test('hurt cannot cancel an active attack/cast or continually restart; attack and death can replace hurt',()=>{
 for(const kind of ['attack','skill']){
  const state=motion.triggerSunriseMotion(motion.emptySunriseClock(),kind,0,timing);
  assert.deepEqual(motion.triggerSunriseMotion(state,'hurt',100,timing),state);
 }
 const hurt=motion.triggerSunriseMotion(motion.emptySunriseClock(),'hurt',0,timing);
 assert.deepEqual(motion.triggerSunriseMotion(hurt,'hurt',100,timing),hurt);
 assert.equal(motion.triggerSunriseMotion(hurt,'attack',100,timing).act,'attack');
 assert.equal(motion.triggerSunriseMotion(hurt,'death',100,timing).act,'death');
});
test('real motion + buffered replay: five incoming attackers and jitter do not stall or burst five outgoing victims',()=>{
 const replaySource=stripTypeScriptTypes(fs.readFileSync(new URL('../lib/game/combat-presentation.ts',import.meta.url),'utf8')).replace(/^import .*;\s*$/gm,'').replaceAll('export ','');
 const timingSource=stripTypeScriptTypes(fs.readFileSync(new URL('../lib/game/replay-timing.ts',import.meta.url),'utf8')).replace(/^import .*;\s*$/gm,'').replaceAll('export ','');
 const ctx={lineageWEffectDefinition:()=>undefined,mythicProcDefinition:()=>undefined,raw:{skills:{}},isFlyingMagic:()=>false,magicFlightMs:()=>200,magicEffectLifetime:()=>800,TRIPLE_FLIGHT_MS:200,ARROW_FLIGHT_MS:200};
 vm.createContext(ctx);vm.runInContext(timingSource+'\n'+replaySource,ctx);
 const h=harness(),ownerKey='network-under-fire:zone';
 let view={hp:1000,mp:100,target:0,arena:Array.from({length:5},(_,slot)=>({uid:`mob${slot}`,id:'ant',hp:30,maxHp:30})),floats:[]};
 const events=[];let seq=0;
 for(let at=100;at<=6000;at+=100){
  if(at%400===0){const strike=at/400-1,slot=Math.floor(strike/3);events.push({seq:++seq,at,kind:'attack',source:'physical',slot,uid:`mob${slot}`,damage:10,mobHp:30-(strike%3+1)*10,hp:1000-at/100,mp:100});}
  events.push({seq:++seq,at,kind:'hurt',slot:at/100%5,uid:`mob${at/100%5}`,damage:1,hp:1000-at/100,mp:100});
 }
 const packets=[];for(let cutoff=350,i=0;cutoff<=6300;cutoff+=350,i++)packets.push({cutoff,arrival:cutoff+[100,260,90][i%3]});
 const health=new Map(view.arena.map(m=>[m.uid,m.hp])),pending=[],shown=[];let queue=[],offset=null,cursor=0,packet=0,maxPerFrame=0;
 const render=()=>h.render({identity:ownerKey,hp:view.hp,local:{running:true,hasTarget:view.arena.some(m=>m.hp>0),blocked:false,ownerKey,targetUid:view.arena[view.target]?.uid,liveTargetUids:view.arena.filter(m=>m.hp>0).map(m=>m.uid)}});
 render();
 for(let now=0;now<=10000;now+=25){
  h.advance(now);
  while(packets[packet]?.arrival<=now){const fresh=[];while(events[cursor]?.at<=packets[packet].cutoff)fresh.push(events[cursor++]);packet++;hitSync.queueLocalHitTargets(ownerKey,fresh);const next=ctx.enqueueSunriseReplay(queue,ctx.prepareCombatHealth(fresh,health),now,offset);queue=next.queue;offset=next.offset;}
  const ready=ctx.drainCombatPresentation(queue,pending,now,false,undefined,e=>hitSync.allowLocalHit(ownerKey,e.uid,e.seq,now));
  const hits=ready.filter(e=>e.kind==='attack');maxPerFrame=Math.max(maxPerFrame,hits.length);shown.push(...hits.map(e=>({...e,shownAt:now})));
  for(const e of ready)view=ctx.applyCombatViewEvent(view,e,now);
  render();
 }
 assert.equal(shown.length,15);assert.equal(new Set(shown.map(e=>e.seq)).size,15);
 assert.equal(maxPerFrame,1,'one displayed contact cannot drain a batch of normal hits');
 assert.ok(view.arena.every(m=>m.hp===0));assert.equal(queue.length,0);
 assert.ok(shown.every(e=>e.shownAt-e.at<1600),'no multi-second timeout-driven HP stall');
 h.unmount();
});
test('real rAF requeue + delayed spawn cannot pin later swings to a completed normal event',()=>{
 const replaySource=stripTypeScriptTypes(fs.readFileSync(new URL('../lib/game/combat-presentation.ts',import.meta.url),'utf8')).replace(/^import .*;\s*$/gm,'').replaceAll('export ','');
 const timingSource=stripTypeScriptTypes(fs.readFileSync(new URL('../lib/game/replay-timing.ts',import.meta.url),'utf8')).replace(/^import .*;\s*$/gm,'').replaceAll('export ','');
 const ctx={lineageWEffectDefinition:()=>undefined,mythicProcDefinition:()=>undefined,raw:{skills:{}},isFlyingMagic:()=>false,magicFlightMs:()=>200,magicEffectLifetime:()=>800,TRIPLE_FLIGHT_MS:200,ARROW_FLIGHT_MS:200};
 vm.createContext(ctx);vm.runInContext(timingSource+'\n'+replaySource,ctx);
 const h=harness(),ownerKey='respawn-under-replay:zone';
 let view={hp:100,mp:100,target:0,arena:['old','other'].map(uid=>({uid,id:'ant',hp:100,maxHp:100})),floats:[]};
 const fresh=[{seq:1,at:0,kind:'spawn',slot:0,spawn:{uid:'new',id:'ant',hp:100,maxHp:100},hp:100,mp:100}];
 for(let i=0;i<20;i++)fresh.push({seq:i+2,at:i*400,kind:'attack',source:'physical',attackId:`p:${i+2}`,uid:'new',slot:0,damage:1,mobHp:99-i,hp:100,mp:100});
 // Deliver future packets over time, rather than pre-retiring every attack
 // before the target spawns. Each packet joins the established 650ms timeline.
 const queue=[],pending=[],shown=[],health=new Map();let cursor=0;
 const render=()=>h.render({identity:ownerKey,hp:view.hp,local:{running:true,hasTarget:true,blocked:false,ownerKey,targetUid:view.arena[0].uid,targetSlot:0,liveTargetUids:view.arena.filter(m=>m.hp>0).map(m=>m.uid)}});
 render();
 for(let now=0;now<=10500;now+=25){
  h.advance(now);
  const packet=[];while(fresh[cursor]?.at<=now)packet.push(fresh[cursor++]);
  queue.push(...ctx.prepareCombatHealth(packet,health).map(e=>({...e,due:e.at+650})));
  queue.sort((a,b)=>a.due-b.due||a.seq-b.seq);
  // Match useCombatReplay's actual ordering: rebuild targets on every rAF,
  // then drain events, then commit their spawn/HP updates to the rendered view.
  hitSync.queueLocalHitTargets(ownerKey,queue);
  const ready=ctx.drainCombatPresentation(queue,pending,now,false,undefined,e=>hitSync.allowLocalHit(ownerKey,e.uid,e.seq,now));
  for(const e of ready){view=ctx.applyCombatViewEvent(view,e,now);if(e.kind==='attack')shown.push(e.seq);}
  render();
 }
 assert.equal(shown.length,20,'normal damage must continue after the first spawned-target hit');
 assert.equal(new Set(shown).size,20);assert.equal(view.arena[0].hp,80);assert.equal(queue.length,0);
 h.unmount();
});





test('manual and automatic spells face their own target while a swing keeps its contact target',()=>{
 const h=harness(),ownerKey='cast-facing:zone';
 const local={running:true,hasTarget:true,blocked:false,ownerKey,targetUid:'left',targetSlot:0,liveTargetUids:['left','right','upper']};
 h.render({identity:ownerKey,local});h.advance(410);
 assert.equal(h.pose().targetUid,'left');
 h.render({local:{...local,targetUid:'right',targetSlot:1}});
 assert.equal(h.pose().targetUid,'left','selection cannot turn a swing already in progress');
 h.render({intent:{id:1,at:410,characterId:'one',skill:'spell',targetUid:'right'}});
 assert.equal(h.pose().kind,'skill');assert.equal(h.pose().targetUid,'right','a manual cast uses its click target');
 h.advance(900);h.render({cues:[{seq:1,kind:'skill',key:'auto',displayAt:900,targetUid:'upper'}]});
 assert.equal(h.pose().kind,'skill');assert.equal(h.pose().targetUid,'upper','an automatic cast uses its event target');
 h.advance(910);h.render({intent:{id:2,at:910,characterId:'one',skill:'self'}});
 assert.equal(h.pose().targetUid,'upper','a self spell retains the current facing');
 h.unmount();
});
