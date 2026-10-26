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
 render();return {render,advance,calls,timers,slots,hide:hidden=>{document.hidden=hidden;listeners.get('visibilitychange')?.();},unmount:()=>{for(const s of slots)s?.cleanup?.();},pose:()=>slots[7].value};
}
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

