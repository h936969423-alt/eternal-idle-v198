const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const {playerAnimationClips}=require('../lib/game/player-animation.ts');
const forms=require('../lib/game/polymorph.json').forms;
const casts=require('../lib/game/polymorph-cast.json');
const audit=require('../docs/polymorph-cast-import.json');
let files=new Set();
for(const form of forms){
 const directions=casts[form.id];
 if(!directions){assert.ok(audit.unavailable.some(x=>x.id===form.id));continue;}
 for(const direction of ['0','1','2']){
  const clip=directions[direction];assert.ok(clip.body.length>=2,form.name);
  assert.equal(clip.layout.viewBox.length,2);assert.ok(clip.layout.width>0&&clip.layout.height>0);
  for(const value of [...clip.layout.viewBox,clip.layout.x,clip.layout.y,clip.layout.width,clip.layout.height])assert.ok(Number.isFinite(value));
  const dims=new Set();
  for(const layer of ['body','shadow','weapon'])for(const [n,url] of clip[layer].entries()){
   if(!url)continue;
   assert.ok(url.startsWith('/assets/polymorph-cast/'));assert.ok(url.endsWith(`_${n}.png`));
   const file=path.join(__dirname,'../public',url),b=fs.readFileSync(file);files.add(url);
   assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');dims.add(`${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`);
  }
  assert.equal(dims.size,1,'all layers must share a canvas');
  assert.deepEqual(clip.layout,directions['2'].layout,'changing direction must not change the cast scale or foot anchor');
  const clips=playerAnimationClips('mage_m',{'mage_m/skill/2':['original-human']},Number(direction),{...form.frames,skill:clip.body});
  assert.deepEqual(clips.skill,clip.body,'cast must use imported morph frames');
  assert.ok(!clips.skill.includes('original-human'));
 }
}
assert.equal(files.size,audit.files);assert.equal(Object.keys(casts).length,audit.imported.length);
assert.equal(audit.imported.length+audit.unavailable.length,forms.length);
console.log(`Passed: ${audit.imported.length} morphs, three target directions, ${files.size} PNGs, aligned layers, dedicated casting and complete missing-asset audit.`);
