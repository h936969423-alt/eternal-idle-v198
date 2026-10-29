import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {playerTargetDirection} from '../lib/game/player-target-facing.ts';
import {sunrisePlayerCues} from '../lib/game/sunrise-player-cues.ts';
import {playerAnimationClips} from '../lib/game/player-animation.ts';
const require=createRequire(import.meta.url);
test('screen vectors choose the matching facing, retaining facing at the same position',()=>{
 const vectors=[[-100,-100],[0,-100],[100,-100],[100,0],[100,100],[0,100],[-100,100],[-100,0]];
 vectors.forEach(([x,y],dir)=>assert.equal(playerTargetDirection(x,y,true),dir));
 assert.deepEqual(vectors.map(([x,y])=>playerTargetDirection(x,y)),[0,1,2,2,2,2,0,0]);
 assert.equal(playerTargetDirection(0,0,false,0),0);
});
test('a cast carries its own target instead of the preceding normal attack target',()=>{
 const cues=sunrisePlayerCues([
  {seq:1,at:10,kind:'attack',source:'player',uid:'left-monster'},
  {seq:2,at:20,kind:'magic',source:'magic',skill:'target-spell',uid:'upper-monster'},
  {seq:3,at:20,kind:'magic',source:'magic',skill:'target-spell',uid:'aoe-secondary'},
  {seq:4,at:30,kind:'magic',source:'magic',skill:'self-spell'},
  {seq:5,at:40,kind:'magic',source:'magic',skill:'proc',weaponProc:true,uid:'right-monster'},
 ]);
 assert.deepEqual(cues.map(c=>[c.kind,c.targetUid]),[['attack','left-monster'],['skill','upper-monster'],['skill',undefined]]);
});
test('death knight uses the dedicated five-frame skill clip in each direction',()=>{
 const attacks=require('../lib/game/polymorph-attack.json').deathknight;
 const casts=require('../lib/game/polymorph-cast.json').deathknight;
 for(const dir of [0,1,2]){
  const attack=attacks[dir],cast=casts[dir];
  assert.equal(cast.body.length,5);assert.equal(attack.source,cast.source);
  assert.deepEqual(attack.layout,cast.layout);
  assert(cast.body.every(src=>/\/skill_\d+\.png$/.test(src)));
  const clips=playerAnimationClips('knight_2hsword',{},dir,{idle:['idle'],attack:attack.body,skill:cast.body});
  assert.deepEqual(clips.skill,cast.body);assert.notDeepEqual(clips.skill,clips.attack);
 }
});
