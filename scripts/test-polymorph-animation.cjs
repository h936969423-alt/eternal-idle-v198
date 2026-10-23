const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const {playerAnimationClips}=require('../lib/game/player-animation.ts');
const forms=require('../lib/game/polymorph.json').forms;
const frames=require('../lib/game/asset-map.json').frames;
for(const form of forms){
 const own=new Set(Object.values(form.frames).flat());
 for(const base of ['mage_m','knight_2hsword','elf_f_ranged','darkelf']){
  const clips=playerAnimationClips(base,frames,2,form.frames);
  assert.ok(clips.skill.length,form.name+' must remain visible when casting');
  for(const seq of Object.values(clips))for(const image of seq)assert.ok(own.has(image),form.name+' must not borrow an original character pose');
 }
}
assert.deepEqual(playerAnimationClips('mage_m',{'mage_m/skill/2':['original']},2,{idle:['poly-idle'],attack:['poly-attack']}).skill,['poly-attack']);
assert.deepEqual(playerAnimationClips('mage_m',{},2,{idle:['idle'],attack:['attack'],cast:['cast']}).skill,['cast']);
assert.deepEqual(playerAnimationClips('mage_m',{},2,{idle:['idle'],skill:['skill'],cast:['cast']}).skill,['skill']);
assert.deepEqual(playerAnimationClips('mage_m',{'mage_m/skill/2':['original']},2).skill,['original']);
assert.deepEqual(playerAnimationClips('knight_2hsword',{'knight8/attack/1':['direction-1'],'knight_2hsword/attack/2':['direction-2']},1).attack,['direction-1']);
console.log('Passed: all '+forms.length+' polymorphs retain their own appearance across casting and missing poses; original character and directional animations preserved.');
