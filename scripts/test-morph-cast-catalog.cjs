const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const {morphCastFor,morphCastFrames,morphCastLayers}=require('../lib/game/morph-cast.ts');
const catalog=require('../lib/game/polymorph-cast-catalog.json');
const audit=require('../docs/polymorph-cast-catalog-import.json');
const release=require('../lib/asset-storage-release.json');
const forms=require('../lib/game/polymorph.json').forms;
const legacy=require('../lib/game/polymorph-cast.json');
let available=0,shadows=0,weapons=0;const files=new Set();
assert.equal(Object.keys(catalog.forms).length,79);
for(const [name,entry] of Object.entries(catalog.forms)){
 const clips=entry.directions;
 if(!Object.keys(clips).length){assert.equal(entry.status,'missing-skill');assert.equal(morphCastFor({id:'unused',name},2),undefined);continue;}
 available++;
 assert.deepEqual(Object.keys(clips).sort(),['0','1','2']);
 shadows+=clips['2'].shadow.some(Boolean)?1:0;weapons+=clips['2'].weapon.some(Boolean)?1:0;
 for(const direction of [0,1,2]){
  const clip=morphCastFor({id:'unused',name},direction);assert.equal(clip,clips[String(direction)]);
  const dims=new Set();assert.ok(clip.body.length>0);
  for(const layer of ['body','shadow','weapon']){
   assert.equal(clip[layer].length,clip.body.length,'secondary layers must keep body indices');
   for(const [n,url] of clip[layer].entries()){
    if(url===null){assert.notEqual(layer,'body');continue;}
    assert.ok(url.endsWith(`_${n}.png`),'exact frame index');files.add(url);
    const data=fs.readFileSync(path.join(__dirname,'../public',url));
    assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
    dims.add(`${data.readUInt32BE(16)}x${data.readUInt32BE(20)}`);
    const sha=crypto.createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');
    const original=audit.gitBlobSha1[url.split('/morphanim/')[1]];assert.match(original,/^[0-9a-f]{40}$/,'original import provenance retained');
    const shipped=release.files[url];if(shipped){assert.equal(data.length,shipped[2]);assert.equal(crypto.createHash('sha256').update(data).digest('hex'),shipped[4],'pinned released bytes after asset normalization');}else assert.equal(sha,original,'untransformed original bytes');
   }
  }
  assert.equal(dims.size,1,'layer canvases aligned');
 }
}
assert.equal(available,61);assert.equal(shadows,57);assert.equal(weapons,23);assert.equal(files.size,3114);
for(const form of forms){
 for(const dir of [0,1,2])if(legacy[form.id])assert.equal(morphCastFor(form,dir),legacy[form.id][dir],'existing calibrated clip is retained');
 assert.ok(morphCastFrames(form).every(x=>typeof x==='string'));
}
for(const [alias,name] of [['真‧死亡騎士','死亡騎士'],['真‧克特','克特'],['高等黑暗精靈','黑暗精靈']])assert.equal(morphCastFor({id:'unused',name:alias},2),catalog.forms[name].directions['2']);
const wolf=morphCastFor({id:'unused',name:'狼人'},2);
assert.equal(wolf.body.length,6);assert.ok(morphCastLayers(wolf,3).shadow);assert.equal(morphCastLayers(wolf,4).shadow,undefined);assert.equal(morphCastLayers(wolf,5).shadow,undefined);
assert.ok(morphCastLayers(wolf,99).body.endsWith('skill_5.png'));
assert.equal(morphCastFor({id:'unused',name:'無對應名稱'},2),undefined,'no invented aliases');
console.log('Passed: 79 source names, 61 casts, 57 shadows, 23 weapon effects, 3114 pinned released PNGs with source provenance, exact layer indices, aliases and existing game mappings.');

