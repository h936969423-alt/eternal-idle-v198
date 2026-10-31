import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';

const context={canonicalWSkill:id=>id,magicVisual:()=>({}),raw:{skills:{}},playerActionKind:()=>'skill',durationFor:()=>1};
vm.createContext(context);
const source=stripTypeScriptTypes(fs.readFileSync(new URL('../lib/game/cast-feedback.ts',import.meta.url),'utf8'))
 .replace(/^import .*;\s*$/gm,'').replaceAll('export ','');
vm.runInContext(source,context);

const event=(slot)=>({seq:10+slot,kind:'attack',at:1000,skill:'sk_fire_storm',source:'magic',manual:true,slot,uid:`m${slot}`});
const save=()=>({characters:[{id:'c',cls:'mage',events:[event(0),event(1),event(2)]}]});
const intent=(extra)=>({id:1,characterId:'c',skill:'sk_fire_storm',at:900,afterSeq:0,effectPreviewed:true,...extra});

test('an area spell marks only the clicked target as already previewed',()=>{
 const out=context.attachCastFeedback(save(),intent({targetUid:'m1'})).characters[0].events;
 assert.deepEqual(out.map(e=>!!e.visualEffectPreviewed),[false,true,false]);
 assert.ok(out.every(e=>e.visualCastAt===900),'the cast pose still follows the click time for every target');
});
test('a spell without a target still previews on every event',()=>{
 const out=context.attachCastFeedback(save(),intent({targetUid:undefined})).characters[0].events;
 assert.ok(out.every(e=>e.visualEffectPreviewed));
});
test('nothing is previewed when the click showed no effect',()=>{
 const out=context.attachCastFeedback(save(),intent({targetUid:'m1',effectPreviewed:false})).characters[0].events;
 assert.ok(out.every(e=>!e.visualEffectPreviewed));
});
