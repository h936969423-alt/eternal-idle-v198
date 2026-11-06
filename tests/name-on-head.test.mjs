import test from 'node:test';
import assert from 'node:assert/strict';
import {opaqueTop} from '../lib/game/sprite-head.ts';
const frame=(w,h,firstRow)=>{const a=new Uint8ClampedArray(w*h*4);for(let y=firstRow;y<h;y++)for(let x=0;x<w;x++)a[(y*w+x)*4+3]=255;return a;};
test('finds the first visible row of a padded frame',()=>{assert.equal(opaqueTop(frame(4,10,3),4,10),.3);assert.equal(opaqueTop(frame(4,10,0),4,10),0);});
test('faint pixels are not the head',()=>{const a=frame(2,4,4);a[3]=10;assert.equal(opaqueTop(a,2,4),.25);});
import {opaqueRows,nameBottom} from '../lib/game/sprite-head.ts';
test('finds both the head row and the feet row',()=>{const w=2,h=10,a=new Uint8ClampedArray(w*h*4);for(let y=2;y<8;y++)a[(y*w)*4+3]=255;assert.deepEqual(opaqueRows(a,w,h),{top:.2,bottom:.8});});
test('the name stays on the body height, not on a raised sword',()=>{assert.equal(nameBottom(200,120,50),150);assert.equal(nameBottom(200,120,undefined),120);});
test('a sword raised beside the body is not the head',()=>{const w=20,h=20,a=new Uint8ClampedArray(w*h*4);const set=(x,y)=>{a[(y*w+x)*4+3]=255;};
 for(let y=8;y<20;y++)for(let x=9;x<=11;x++)set(x,y);   // body and head from row 8
 for(let y=1;y<10;y++)set(17,y);                          // sword tip up at row 1, off to the side
 assert.equal(opaqueRows(a,w,h).top,8/20);assert.equal(opaqueRows(a,w,h).bottom,1);});
