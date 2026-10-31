import test from 'node:test';
import assert from 'node:assert/strict';
import {monsterPosition,worldBossPosition,dragon381Position} from '../lib/game/battle-layout.ts';

test('five ordinary monsters occupy three front and two back anchors',()=>{
 const p=Array.from({length:5},(_,i)=>monsterPosition(i,5));
 assert.deepEqual(p,[{x:49,y:77},{x:68,y:77},{x:87,y:77},{x:59,y:43},{x:79,y:43}]);
 assert.ok(p.slice(0,3).every(v=>v.y>p[3].y));
 assert.ok(p.every(v=>v.x>=45&&v.x<=88&&v.y>=28&&v.y<=84));
});
test('ordinary positions are stable by slot',()=>{
 for(let i=0;i<5;i++)assert.deepEqual(monsterPosition(i,5),monsterPosition(i,5));
});
test('boss and dragon anchors remain separate',()=>{
 assert.deepEqual(worldBossPosition(0,1),{x:70,y:58});
 assert.deepEqual(dragon381Position(0),{x:70,y:60});
});
test('three ordinary monsters: back slot first, two front slots drawn over it',()=>{
 const p=Array.from({length:3},(_,i)=>monsterPosition(i,3));
 assert.deepEqual(p,[{x:69,y:52},{x:52,y:82},{x:86,y:82}]);
 assert.ok(p[1].y>p[0].y&&p[2].y>p[0].y);
 assert.ok(p.every(v=>v.x>=45&&v.x<=88&&v.y>=28&&v.y<=84));
 for(let i=0;i<3;i++)for(let j=0;j<i;j++)assert.ok(Math.hypot(p[i].x-p[j].x,p[i].y-p[j].y)>=14);
});
