import test from 'node:test';
import assert from 'node:assert/strict';
import {opaqueTop} from '../lib/game/sprite-head.ts';
const frame=(w,h,firstRow)=>{const a=new Uint8ClampedArray(w*h*4);for(let y=firstRow;y<h;y++)for(let x=0;x<w;x++)a[(y*w+x)*4+3]=255;return a;};
test('finds the first visible row of a padded frame',()=>{assert.equal(opaqueTop(frame(4,10,3),4,10),.3);assert.equal(opaqueTop(frame(4,10,0),4,10),0);});
test('faint pixels are not the head',()=>{const a=frame(2,4,4);a[3]=10;assert.equal(opaqueTop(a,2,4),.25);});
