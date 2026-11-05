import test from 'node:test';
import assert from 'node:assert/strict';
import {MONSTER_WALK_RANGE,monsterWalk,playerWalkGoal,stepToward,walkDirection,walkFrames} from '../lib/game/field-walk.ts';
test('monster walk is deterministic and stays in range',()=>{for(let t=0;t<60000;t+=137){const a=monsterWalk('m-7',t);assert.deepEqual(a,monsterWalk('m-7',t));assert.ok(Math.abs(a.x)<=MONSTER_WALK_RANGE.x&&Math.abs(a.y)<=MONSTER_WALK_RANGE.y);}});
test('monster walk has no jumps across cycles',()=>{let p=monsterWalk('m-9',0);for(let t=20;t<30000;t+=20){const n=monsterWalk('m-9',t);assert.ok(Math.hypot(n.x-p.x,n.y-p.y)<1);p=n;}});
test('monsters alternate between moving and standing',()=>{const s=new Set();for(let t=0;t<9000;t+=100)s.add(monsterWalk('m-1',t).moving);assert.equal(s.size,2);});
test('player stays left of target and returns home without one',()=>{const arena={width:400,height:300},home={x:96,y:186},melee=playerWalkGoal(home,{x:280,y:200},arena,false),ranged=playerWalkGoal(home,{x:280,y:200},arena,true);assert.ok(home.x+melee.x<280);assert.ok(ranged.x<melee.x);assert.deepEqual(playerWalkGoal(home,undefined,arena,false),{x:0,y:0});assert.equal(playerWalkGoal(home,{x:90,y:186},arena,false).x,0);});
test('stepping never overshoots',()=>{assert.deepEqual(stepToward({x:0,y:0},{x:3,y:4},10),{x:3,y:4});const s=stepToward({x:0,y:0},{x:30,y:40},5);assert.ok(Math.abs(Math.hypot(s.x,s.y)-5)<1e-9);});
test('walk direction and frame paths match client files',()=>{assert.equal(walkDirection(1,0),2);assert.equal(walkDirection(-1,0),6);assert.equal(walkDirection(0,1),4);assert.deepEqual(walkFrames({2:2},'mage_m',2),['/assets/client-walk/v1/mage_m/2_0.webp','/assets/client-walk/v1/mage_m/2_1.webp']);assert.deepEqual(walkFrames(undefined,'royal_m',2),[]);});
