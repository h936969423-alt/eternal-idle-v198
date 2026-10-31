import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';

const context={effects:{},raw:{skills:{},items:{}},legacyEffectNames:{},canonicalWSkill:id=>id,skillVisual:()=>undefined};
vm.createContext(context);
const source=stripTypeScriptTypes(fs.readFileSync(new URL('../lib/game/magic-visuals.ts',import.meta.url),'utf8'))
 .replace(/^import .*;\s*$/gm,'').replaceAll('export ','');
vm.runInContext(source,context);
const held=context.heldSpellElapsed;

test('before the contact frame the preview plays normally',()=>{
 assert.equal(held(100,300,null),100);
 assert.equal(held(300,300,null),300);
});
test('an unconfirmed preview freezes on its contact frame',()=>{
 assert.equal(held(500,300,null),300);
 assert.equal(held(1700,300,null),300);
});
test('confirmation resumes playback from the contact frame',()=>{
 // confirmed 800ms after the click; contact frame at 300ms => 500ms pause
 assert.equal(held(800,300,800),300);
 assert.equal(held(1000,300,800),500);
});
test('confirmation before the contact frame never pauses the effect',()=>{
 assert.equal(held(500,300,200),500);
});
test('a lost reply cannot freeze the effect forever',()=>{
 assert.equal(held(300+1500+200,300,null),500);
});
