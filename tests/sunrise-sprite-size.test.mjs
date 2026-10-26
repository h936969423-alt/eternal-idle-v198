import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sunriseMonsterSize,SUNRISE_SCENE_WIDTH,SUNRISE_GROUND_HEIGHT} from '../lib/game/sunrise-sprite-layout.ts';
test('small native monster pixels are never enlarged',()=>{
 assert.deepEqual(sunriseMonsterSize('狼',91,46),{width:91,height:46,scale:1});
 assert.deepEqual(sunriseMonsterSize('小頭目',60,80,true),{width:60,height:80,scale:1});
});
test('large monsters are capped proportionally with no square distortion',()=>{
 const n=sunriseMonsterSize('不幸的幻象眼魔',172,246);
 assert.equal(n.height,134);assert.ok(Math.abs(n.width/n.height-172/246)<1e-12);
 const b=sunriseMonsterSize('不死鳥',640,477,true);
 assert.equal(b.height,185);assert.ok(Math.abs(b.width/b.height-640/477)<1e-12);
});
test('source large-canvas exceptions retain 185px allowance',()=>{
 for(const name of ['遺忘之島飛龍','哈維','遺忘之島哈維','希爾黛斯'])assert.equal(sunriseMonsterSize(name,399,300).height,185);
 assert.equal(SUNRISE_SCENE_WIDTH,800);assert.equal(SUNRISE_GROUND_HEIGHT,242);
});
