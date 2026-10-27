import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {setLocalHitActive,clearLocalHits,queueLocalHitTargets,beginLocalSwing,currentLocalSwing,recordLocalContact,allowLocalHit} from '../lib/game/local-hit-sync.ts';
import {playerTargetDirection} from '../lib/game/player-target-facing.ts';
const source=stripTypeScriptTypes(fs.readFileSync(new URL('../lib/game/combat-presentation.ts',import.meta.url),'utf8')).replace(/^import .*;\s*$/gm,'').replaceAll('export ','');
const ctx={lineageWEffectDefinition:()=>({}),mythicProcDefinition:()=>({}),raw:{skills:{}},isFlyingMagic:()=>false,magicFlightMs:()=>200,magicEffectLifetime:()=>800,TRIPLE_FLIGHT_MS:200,ARROW_FLIGHT_MS:200,REPLAY_MAX_AHEAD_MS:1500};
vm.createContext(ctx);vm.runInContext(source,ctx);
const hit=(seq,uid,slot,extra={})=>({seq,uid,slot,kind:'attack',source:'physical',at:0,due:0,hp:100,mp:100,...extra});
test('pet, AoE, poison and monster snapshots do not steal the player target',()=>{
 for(const e of [hit(1,'right',1,{source:'pet'}),hit(2,'up',2,{source:'poison'}),hit(3,'up',2,{skill:'meteor'}),hit(4,'right',1,{weaponProc:true}),{kind:'hurt',source:'monster',target:2},{kind:'state',target:1}])assert.equal(ctx.playerEventTarget(0,e),0);
 assert.equal(ctx.playerEventTarget(0,hit(5,'up',2)),2);
 assert.equal(ctx.playerEventTarget(0,{kind:'state',effect:'target-selected',slot:1}),1);
});
test('one swing binds the earliest confirmed UID/sequence, regardless of later temporary target changes',()=>{
 const key='lock:one';clearLocalHits(key);setLocalHitActive(key,true,.4);
 queueLocalHitTargets(key,[hit(1,'left',0),hit(2,'right',1,{source:'pet'}),hit(3,'up',2,{skill:'meteor'}),hit(4,'left',0)]);
 const swing=beginLocalSwing(key,{uid:'right',slot:1},['left','right','up']);assert.deepEqual(swing,{seq:1,uid:'left',slot:0});
 queueLocalHitTargets(key,[hit(5,'up',2)]);assert.deepEqual(currentLocalSwing(key),swing);
 recordLocalContact(key,swing.uid,125,swing.seq);assert.equal(allowLocalHit(key,'up',5,125),false);
 assert.equal(allowLocalHit(key,'left',4,125),false);assert.equal(allowLocalHit(key,'left',1,125),true);
 assert.deepEqual(beginLocalSwing(key,{uid:'right',slot:1},['left','right','up']),{seq:4,uid:'left',slot:0});
 recordLocalContact(key,'left',250,4);assert.equal(allowLocalHit(key,'left',4,250),true);
 assert.deepEqual(beginLocalSwing(key,{uid:'right',slot:1},['right','up']),{seq:5,uid:'up',slot:2});
});
test('timeout cannot release another live target while swinging at a different UID',()=>{
 const key='lock:two';clearLocalHits(key);setLocalHitActive(key,true,.4);beginLocalSwing(key,{uid:'left',slot:0});
 assert.equal(allowLocalHit(key,'right',2,0),false);assert.equal(allowLocalHit(key,'right',2,5000),false);
});
test('a retired hit requeued before drain cannot remain as the next swing target after a spawn',()=>{
 const key='lock:spawn-stall';clearLocalHits(key);setLocalHitActive(key,true,.4);
 const first=hit(1,'new',0),second=hit(2,'new',0);
 queueLocalHitTargets(key,[first]);
 // The confirmed target exists on the server, but its spawn is not visible yet.
 beginLocalSwing(key,{uid:'old',slot:0},['old']);
 // The replay's next rAF repopulates its target list before draining events.
 queueLocalHitTargets(key,[first]);
 assert.equal(allowLocalHit(key,'new',1,125),true);
 // Spawn is now visible and the first (nonlethal) hit has left the replay queue.
 queueLocalHitTargets(key,[second]);
 const next=beginLocalSwing(key,{uid:'new',slot:0},['new']);
 assert.equal(next.seq,2,'a drained seq=1 must not permanently capture every later swing');
 recordLocalContact(key,next.uid,525,next.seq,500);
 assert.equal(allowLocalHit(key,'new',2,525),true);
});
test('confirmed hits drained while stopped cannot become ghost targets on restart',()=>{
 const key='lock:stop';clearLocalHits(key);setLocalHitActive(key,true,.4);
 queueLocalHitTargets(key,[hit(1,'old',0)]);beginLocalSwing(key,{uid:'old',slot:0});setLocalHitActive(key,false,.4);
 assert.equal(currentLocalSwing(key),undefined);
 assert.equal(allowLocalHit(key,'old',1,100),true);setLocalHitActive(key,true,.4);
 assert.deepEqual(beginLocalSwing(key,{uid:'new',slot:1},['old','new']),{uid:'new',slot:1});
});
test('normal results remain globally ordered across targets; stale UID cannot damage a replacement',()=>{
 const queue=[{...hit(1,'left',0),due:100},hit(2,'right',1)],pending=[];
 assert.equal(ctx.drainCombatPresentation(queue,pending,0,false,undefined,()=>true).length,0);
 assert.deepEqual(Array.from(ctx.drainCombatPresentation(queue,pending,100,false,undefined,()=>true),e=>e.uid),['left','right']);
 const view={hp:100,mp:100,target:0,arena:[{uid:'new',id:'ant',hp:100}],floats:[]};
 assert.equal(ctx.applyCombatViewEvent(view,{...hit(3,'old',0),damage:20,mobHp:0},100),view);
});
test('target vector selects real directional assets with the Sunrise three-direction fold',()=>{
 const vectors=[[-10,-10,0],[0,-10,1],[10,-10,2],[10,0,3],[10,10,4],[0,10,5],[-10,10,6],[-10,0,7]];
 for(const [x,y,d]of vectors)assert.equal(playerTargetDirection(x,y,true),d);
 assert.equal(playerTargetDirection(-10,0),0);assert.equal(playerTargetDirection(0,-10),1);assert.equal(playerTargetDirection(10,0),2);
});

