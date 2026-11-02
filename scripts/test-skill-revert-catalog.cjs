// 2026-11-02: ordinary and class skills play with their original rules and names again (W icons kept);
// every Lineage W skill without an old version is removed, 潛力 and 攻城 included (legacy-skills-v3).
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'skill-revert-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
try{
 for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
 const e=require(path.join(dir,'engine.js')),W=require(path.join(dir,'lineagew-skill-data.js')),assets=require(path.join(dir,'asset-map.json'));
 const catalog=JSON.parse(fs.readFileSync(path.join(root,'lib/game/lineagew-skills.json'),'utf8')).skills;
 // No Lineage W skill is played under its own id; every catalogue skill is either reverted or removed.
 assert.equal(Object.keys(W.W_SKILLS).length,0);
 assert.equal(Object.keys(W.W_REVERTED).length+W.W_REMOVED.size,Object.keys(catalog).length);
 assert.equal(W.W_REMOVED.size,162);
 for(const id of Object.keys(catalog).filter(id=>/^(潛力|攻城)/.test(catalog[id].lwCategory||'')))assert(W.W_REMOVED.has(id),id+' 潛力/攻城 removed');
 // Reverted skills: original definition and name, Lineage W icon.
 for(const [id,old] of Object.entries(W.W_REVERTED)){
  const def=e.DATA.skills[old];assert(def&&!def.lwClasses,old+' uses its original definition');assert(!e.DATA.skills[id],id+' is no longer a separate skill');
  if(catalog[id].lwIcon)assert.equal(assets.icons.skills[def.n],catalog[id].lwIcon,`${def.n} keeps its icon`);
  assert.equal(W.canonicalWSkill(id),old);
 }
 // Removed skills are gone from the table; kept icons are untouched.
 for(const id of W.W_REMOVED)assert(!e.DATA.skills[id],id+' removed');
 // Every skill book still teaches an existing skill, or is a retired book of a removed skill.
 const retired=require(path.join(dir,'retired-items.js')).RETIRED_ITEMS;
 for(const [id,i] of Object.entries(e.DATA.items))if(i.type==='skillbk'||i.sk&&i.lwSkillBook)assert(e.DATA.skills[W.canonicalWSkill(i.sk)]||Object.hasOwn(retired,id),id+' teaches '+i.sk);
 console.log(`PASS skill revert: ${Object.keys(W.W_REVERTED).length} original skills with original names/rules and unchanged icons, ${W.W_REMOVED.size} removed (潛力/攻城 included)`);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
