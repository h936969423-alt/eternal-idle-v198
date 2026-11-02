// One classification for "player skill that strikes with the weapon". The lists used to be copied
// into several files and drifted (衝擊之暈/會心一擊 animated as attacks but showed blue ✦ magic numbers).
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'skill-groups-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
try{
 for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
 const G=require(path.join(dir,'skill-groups.js')),D=require(path.join(dir,'damage-display.js')),C=require(path.join(dir,'animation-cues.js')),W=require(path.join(dir,'lineagew-skill-data.js')),P=require(path.join(dir,'projectile-timing.js'));
 const physical=Object.entries(W.W_SKILLS).filter(([,s])=>s.type==='atk'&&s.dmgType==='physical').map(([id])=>id);
 assert.ok(physical.length>=11);
 assert.deepEqual([...D.PHYSICAL_SKILLS_LOCAL].sort(),[...G.PHYSICAL_PLAYER_SKILLS].sort(),'damage-display copy must equal the catalogue-derived set');
 for(const old of Object.keys(W.W_LEGACY))assert.equal(G.isPhysicalSkill(old),G.isPhysicalSkill(W.W_LEGACY[old]),old+' and its new id are classified alike');
 for(const id of P.TRIPLE_ARROW_SKILLS)assert.ok(G.isPhysicalSkill(id));
 for(const id of physical){
  assert.equal(C.playerActionKind(id),'attack',id+' uses the attack pose');
  assert.equal(D.damageDisplay({kind:'attack',skill:id,source:'physical',damage:9}).kind,'physical-damage',id+' shows red physical numbers');
 }
 const magic=Object.entries(W.W_SKILLS).filter(([,s])=>s.type==='atk'&&s.dmgType!=='physical').map(([id])=>id);
 for(const id of magic){assert.equal(C.playerActionKind(id),'skill');assert.equal(D.damageDisplay({kind:'attack',skill:id,source:'magic',damage:9}).kind,'magic-damage');}
 console.log(`PASS skill groups: ${physical.length} physical W skills (+old ids) share one list; ${magic.length} magic skills stay magic`);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
