const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const {morphAttackFor,morphCastFor,playerBattleDirection}=require('../lib/game/morph-cast.ts');
const {playerAnimationClips}=require('../lib/game/player-animation.ts');
const forms=require('../lib/game/polymorph.json').forms;
const attacks=require('../lib/game/polymorph-attack.json');
const audit=require('../docs/polymorph-attack-import.json');
const files=new Set();
for(const form of forms){
 for(const target of [0,2,1,0,1,2]){
  const direction=playerBattleDirection(target,form),attack=morphAttackFor(form,direction),cast=morphCastFor(form,direction);
  if(!attack){assert.equal(direction,2,'single-direction forms must not rotate only when casting');continue;}
  assert.equal(direction,2,'target changes must never rotate the player');assert.ok(cast);
  assert.equal(attack.source,cast.source,'attack and casting must use the same facing folder');
  assert.deepEqual(attack.layout,cast.layout,'same canvas transform for both actions');
  const clips=playerAnimationClips('mage_m',{'mage_m/skill/2':['human']},direction,{...form.frames,attack:attack.body,skill:cast.body});
  assert.deepEqual(clips.attack,attack.body);assert.deepEqual(clips.skill,cast.body);
  for(const layer of ['body','shadow','weapon']){
   assert.equal(attack[layer].length,attack.body.length);
   for(const [n,url] of attack[layer].entries()){
    if(!url)continue;files.add(url);assert.ok(url.endsWith(`_${n}.png`));
    const data=fs.readFileSync(path.join(__dirname,'../public',url));assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
    const sha=crypto.createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');assert.equal(sha,audit.gitBlobSha1[url.split('/morphanim/')[1]]);
    const castData=fs.readFileSync(path.join(__dirname,'../public',cast.body[0]));assert.ok(data.subarray(16,24).equals(castData.subarray(16,24)),'shared attack/cast canvas');
   }
  }
 }
}
assert.equal(Object.keys(attacks).length,17);assert.ok(files.size>100);
assert.equal(playerBattleDirection(undefined),2);assert.equal(playerBattleDirection(0),2);assert.equal(playerBattleDirection(99),2);
for(const direction of [0,1,2,3,4,5,6,7]){
 const clips=playerAnimationClips('knight_2hsword',{[`knight8/attack/${direction}`]:['matching-attack'],'knight_2hsword/skill/2':['wrong-facing-cast']},direction);
 assert.deepEqual(clips.skill,clips.attack,'untransformed knight must keep attack facing when no matching cast exists');
}
assert.deepEqual(playerAnimationClips('knight_2hsword',{'knight8/attack/0':['attack'],'knight8/skill/0':['cast']},0).skill,['cast']);
console.log(`Passed: fixed right-facing attacks/casts across targets; ${files.size} audited layers align; single-direction forms and knight fallback preserve facing.`);
