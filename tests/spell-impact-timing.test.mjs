import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';

const effects={
 long:{frames:Array(23).fill('frame'),fps:16,self:false},
 short:{frames:Array(3).fill('frame'),fps:12,self:false},
 explicit:{frames:Array(20).fill('frame'),fps:16,self:false,hitFrame:10},
 layered:{frames:['frame'],layers:[Array(18).fill('layer')],fps:24,self:false},
};
const context={effects,raw:{skills:{},items:{}},legacyEffectNames:{},canonicalWSkill:id=>id,skillVisual:()=>undefined};
vm.createContext(context);
const source=stripTypeScriptTypes(fs.readFileSync(new URL('../lib/game/magic-visuals.ts',import.meta.url),'utf8'))
 .replace(/^import .*;\s*$/gm,'').replaceAll('export ','');
vm.runInContext(source,context);

test('unannotated long spells deal damage during the effect, before its fade',()=>{
 const hit=context.spellImpactMs({effectName:'long'});
 assert.ok(hit>0&&hit<=350);
 assert.ok(context.magicFrame(hit,16,23)>=0);
 assert.ok(hit<22*1000/16);
});
test('short spells can hit on their first frame rather than their last frame',()=>{
 assert.equal(context.spellImpactMs({effectName:'short'}),0);
});
test('explicit contact metadata remains authoritative',()=>{
 assert.equal(context.spellImpactMs({effectName:'explicit'}),625);
});
test('layered effects use the full animation when selecting contact',()=>{
 const hit=context.spellImpactMs({effectName:'layered'});
 assert.ok(hit>0&&hit<=350);
});
test('an absent effect does not introduce a half-second damage delay',()=>{
 assert.equal(context.spellImpactMs({effectName:'missing'}),200);
});
