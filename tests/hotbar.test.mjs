import test from 'node:test';
import assert from 'node:assert/strict';
import {HOTBAR_SIZE,defaultHotbar,hotbarItemAction,nextTargetSlot,placeInHotbar,resolveHotbar,sanitizeHotbar,selfHealSkill} from '../lib/game/hotbar.ts';
test('a bad request always becomes seven clean slots',()=>{
 for(const bad of [undefined,null,'x',5,{},[{k:'x',id:'a'},{k:'s',id:'bad id!'},{k:'i'},{k:'s',id:'sk_heal'}]]){const out=sanitizeHotbar(bad);assert.equal(out.length,HOTBAR_SIZE);}
 assert.deepEqual(sanitizeHotbar([{k:'x',id:'a'},{k:'s',id:'bad id!'},{k:'i'},{k:'s',id:'sk_heal',extra:1}]).slice(0,4),[null,null,null,{k:'s',id:'sk_heal'}]);
 assert.equal(sanitizeHotbar(Array.from({length:20},()=>({k:'i',id:'potion_heal'}))).length,HOTBAR_SIZE);
});
test('default bar puts skills first and the four supplies last',()=>{
 const bar=defaultHotbar(['a','b','c','d','e']);
 assert.deepEqual(bar.map(s=>s?.id??null),['a','b','c','potion_heal','potion_strong','potion_ult','scroll_poly']);
 assert.deepEqual(defaultHotbar([]).slice(0,3),[null,null,null]);
});
test('a saved bar wins over the default, even when it is all empty',()=>{
 assert.deepEqual(resolveHotbar(Array(7).fill(null),['a']),Array(7).fill(null));
 assert.equal(resolveHotbar(undefined,['a'])[0]?.id,'a');
});
test('placing moves an entry instead of duplicating it',()=>{
 const bar=defaultHotbar(['a']);const next=placeInHotbar(bar,0,{k:'i',id:'potion_ult'});
 assert.equal(next[0]?.id,'potion_ult');assert.equal(next.filter(s=>s?.id==='potion_ult').length,1);
 assert.equal(placeInHotbar(next,0,null)[0],null);
 assert.deepEqual(placeInHotbar(next,9,{k:'s',id:'z'}),next);
});
test('only potions and self-use scrolls can sit on the bar',()=>{
 assert.equal(hotbarItemAction({type:'pot'}),'potion');
 assert.equal(hotbarItemAction({type:'scroll',eff:'poly'}),'useScroll');
 assert.equal(hotbarItemAction({type:'scroll',eff:'teleport_scroll'}),null);
 assert.equal(hotbarItemAction({type:'wpn'}),null);assert.equal(hotbarItemAction(undefined),null);
});
test('SELF picks the strongest heal and ignores other spells',()=>{
 const skills={a:{type:'heal',mp:4},b:{type:'heal',mp:16},c:{type:'atk',mp:30}};
 assert.equal(selfHealSkill(['a','b','c'],skills),'b');assert.equal(selfHealSkill(['c'],skills),undefined);
});
test('changing target skips the dead and wraps around',()=>{
 assert.equal(nextTargetSlot([10,0,5],0),2);assert.equal(nextTargetSlot([10,0,5],2),0);
 assert.equal(nextTargetSlot([10,0,0],0),undefined);assert.equal(nextTargetSlot([],0),undefined);
});
