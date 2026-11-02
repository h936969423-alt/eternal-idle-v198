// 全魔法之書 (GM): one book per class learns every magic of that class at any level, is not consumed,
// cannot be sold, and lets an elf learn and cast all four element lines.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'gm-all-magic-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
try{
 for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
 const e=require(path.join(dir,'engine.js')),G=require(path.join(dir,'gm-grants.js')),O=require(path.join(dir,'gm-item-options.js')),S=require(path.join(dir,'spell-rules.js')),W=require(path.join(dir,'lineagew-skill-data.js')),A=require(path.join(dir,'skill-access.js'));
 const at=1000000,rng=()=>.5;
 const make=cls=>{const alloc={};let left=e.BASES[cls].pts;for(const k of ['str','dex','con','int','wis','cha']){alloc[k]=Math.min(left,18-e.BASES[cls][k]);left-=alloc[k];}const c=e.createCharacter('全魔法'+cls,cls,'m',alloc,at);c.running=false;return {c,save:{v:1,at,active:c.id,characters:[c]}};};
 const learnable=c=>Object.entries(e.DATA.skills).filter(([,s])=>Number.isFinite(S.requiredSkillLevel(c,s))).map(([id])=>id);
 for(const cls of ['knight','mage','elf','dark','royal']){
  const book=`gm_all_magic_${cls}`;assert.ok(O.itemOptions.some(o=>o.id===book&&o.category==='book'),book+' is offered in the GM item list under books');
  const {c,save}=make(cls);assert.equal(c.lv,1);
  G.applyGrant(save,G.validateGrant({characterId:c.id,type:'item',itemId:book,quantity:1}),at);assert.equal(c.bag[book],1);
  e.action(save,{type:'useItem',item:book},at,rng);
  const all=learnable(c);for(const id of all)assert.ok(A.hasSkill(c,id),`${cls} learned ${id} (${e.DATA.skills[id].n})`);
  assert.equal(c.skills.length,new Set(c.skills).size,'no duplicates');
  for(const id of c.skills){const up=e.DATA.skills[id]?.lwUpgradeOf;if(up)assert.ok(c.skills.indexOf(up)<c.skills.indexOf(id),'prerequisite first: '+id);}
  assert.equal(c.bag[book],1,'the book is not consumed');
  const count=c.skills.length;e.action(save,{type:'useItem',item:book},at,rng);assert.equal(c.skills.length,count,'re-use is harmless');
  assert.throws(()=>e.action(save,{type:'sell',item:book,n:1},at,rng),'cannot be sold');
  console.log(`PASS ${cls}: Lv.1 learned all ${all.length} magic (${all.filter(id=>W.W_SKILLS[id]).length} Lineage W + ${all.filter(id=>!W.W_SKILLS[id]).length} older), book kept`);
 }
 // Wrong class.
 {const {c,save}=make('knight');c.bag.gm_all_magic_elf=1;assert.throws(()=>e.action(save,{type:'useItem',item:'gm_all_magic_elf'},at,rng),/職業不符/);assert.equal(c.skills.length,0);}
 // Elf: every element line is learned and castable regardless of the chosen element.
 {const {c,save}=make('elf');c.elfEle='fire';c.bag.gm_all_magic_elf=1;e.action(save,{type:'useItem',item:'gm_all_magic_elf'},at,rng);
  assert.equal(c.gmAllElements,true);const water=Object.entries(W.W_SKILLS).filter(([,s])=>s.reqEle==='water'&&s.lwClasses.includes('elf'));assert.ok(water.length);
  for(const [id,s] of water){assert.ok(A.hasSkill(c,id));assert.equal(W.wElementAllowed(c,s),true,s.n+' castable');}
  // Without the book, the element rule still applies to other elves.
  const other=make('elf').c;other.elfEle='fire';assert.equal(W.wElementAllowed(other,water[0][1]),false);}
 console.log('PASS gm all-magic books: wrong class refused; elf learns and may cast all four elements; others keep the element rule');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
