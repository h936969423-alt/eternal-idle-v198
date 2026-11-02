const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'w-skills-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
let checks=0;const check=(name,fn)=>{fn();checks++;console.log('PASS',name);};
try{
 for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true},reportDiagnostics:true}).outputText);}
 const data=require(path.join(dir,'lineagew-skill-data.js')),runtime=require(path.join(dir,'lineagew-skill-runtime.js')),access=require(path.join(dir,'skill-access.js')),book=process.env.W_SKILLS_UNIT_ONLY==='1'?null:require(path.join(dir,'skill-book.js'));
 // Since legacy-skills-v3 no Lineage W skill is played under its own id: 69 are the original skills again
 // (W icons and books kept), the rest (潛力/攻城 included) are removed and their books retired.
 // W_SKILLS_NO_ASSETS=1 skips file-existence checks where the assets are not restored.
 const raw=require(path.join(dir,'gamedata.json')),catalog=JSON.parse(fs.readFileSync(path.join(root,'lib/game/lineagew-skills.json'),'utf8')),{RETIRED_ITEMS}=require(path.join(dir,'retired-items.js'));
 const exists=p=>process.env.W_SKILLS_NO_ASSETS==='1'||fs.existsSync(path.join(root,'public',p));
 check('Catalogue: every W skill is reverted or removed, reverted icons still exist',()=>{
  assert.deepEqual(Object.keys(data.W_SKILLS),[]);
  for(const id of Object.keys(catalog.skills))assert.ok(!!data.W_REVERTED[id]!==data.W_REMOVED.has(id),id);
  for(const id of Object.keys(data.W_REVERTED)){const icon=catalog.skills[id].lwIcon;if(icon)assert.ok(exists(icon),id+' icon kept for the reverted skill');}
 });
 check('Books: only reverted skills keep books; removed skills\' books are retired',()=>{
  for(const [id,b] of Object.entries(catalog.books)){if(data.W_REMOVED.has(b.sk)){assert.ok(Object.hasOwn(RETIRED_ITEMS,id),id);assert.ok(!data.W_BOOKS[id]);}else assert.ok(data.W_BOOKS[id],id);}
  const iconMap=require(path.join(dir,'asset-map.json')).icons;
  for(const item of Object.values(data.W_BOOKS).filter(b=>b.lwItemIconSource)){assert.ok(item.lwItemIconSource.includes('/Item/'));assert.equal(iconMap.items[item.n],item.lwIcon);assert.ok(exists(item.lwIcon));}
 });
 check('Lineage W-period ids resolve once to the original skill',()=>{const c={cls:'mage',skills:['sk_lightarrow','lw_skill_10'],equipment:{}};const before=JSON.stringify(c.skills);assert.equal(access.availableSkills(c).filter(id=>id==='sk_lightarrow').length,1);assert.ok(access.hasSkill(c,'sk_lightarrow'));assert.ok(access.hasSkill(c,'lw_skill_10'));assert.equal(JSON.stringify(c.skills),before);});
 check('The W runtime refuses removed skills',()=>{const id=[...data.W_REMOVED][0],c={cls:catalog.skills[id].lwClasses[0],lv:99,skills:[id],buffs:{},mp:1000,hp:1000,equipment:{}};assert.throws(()=>runtime.castWSkill(c,id,{maxHp:1000,maxMp:1000},{},1000,()=>0),/技能不存在/);assert.equal(c.mp,1000);});
 if(book)check('Skill book: original 通用魔法書 tiers and class skills, no Lineage W skill',()=>{
  const mage=book.bookSections({cls:'mage',skills:[]});assert.deepEqual(mage.map(s=>s.title),['通用魔法書']);assert.deepEqual(mage[0].tiers.map(t=>t.tier),[1,2,3,4,5,6,7,8,9,10]);
  assert.deepEqual(mage[0].tiers[0].slots,['sk_heal1','sk_sunlight','sk_shield','sk_lightarrow','sk_teleport','sk_icearrow','sk_windblade','sk_holy_wpn']);
  for(const t of mage[0].tiers)assert.equal(t.slots.length%8,0);
  const elf=book.bookSections({cls:'elf',skills:[]});assert.deepEqual(elf.map(s=>s.title),['通用魔法書','妖精魔法']);
  for(const cls of ['royal','knight','elf','mage','dark'])for(const id of book.bookSections({cls,skills:[]}).flatMap(s=>s.tiers.flatMap(t=>t.slots)).filter(Boolean))assert.ok(!id.startsWith('lw_')&&raw.skills[id],cls+' '+id);
  const gm=book.bookSections({cls:'knight',skills:['sk_meteor']});assert.equal(gm.at(-1).title,'其他已學技能');assert.ok(gm.at(-1).tiers[0].slots.includes('sk_meteor'));
 });
 if(process.env.W_SKILLS_UNIT_ONLY!=='1'){
  const e=require(path.join(dir,'engine.js')),time=1_000_000;
  function actual(cls){const allocation={};let left=e.BASES[cls].pts;for(const k of ['str','dex','con','int','wis','cha']){allocation[k]=Math.min(left,20-e.BASES[cls][k]);left-=allocation[k];}const c=e.createCharacter('技能測試',cls,'m',allocation,time);c.lv=99;c.gold=100000000;c.lawful=32767;c.hp=e.stats(c,time).maxHp;c.mp=e.stats(c,time).maxMp;return c;}
  check('Real engine cannot buy a removed 潛力 book',()=>{const c=actual('knight'),save={v:1,at:time,active:c.id,characters:[c]};c.zone='town_silver_knight';const id=Object.keys(catalog.skills).find(k=>/^潛力/.test(catalog.skills[k].lwCategory||'')&&catalog.skills[k].lwClasses.includes('knight'));const gold=c.gold;assert.throws(()=>e.action(save,{type:'buySkillBook',skill:id},time,()=>.5));assert.equal(c.gold,gold);});
  check('Real engine casts an original single-target spell on one encounter',()=>{const c=actual('mage');c.skills=['sk_lightarrow'];c.zone='training';e.ensureArena(c,()=>.5,time);c.arena.forEach(t=>t.hp=100000);const before=c.arena.slice(1).map(t=>t.hp);e.cast(c,'lw_skill_10',time,()=>.5);const hits=c.events.filter(x=>x.kind==='attack'&&x.skill==='sk_lightarrow');assert.ok(hits.length>=1);assert.deepEqual(c.arena.slice(1).map(t=>t.hp),before);});
  check('A learned 潛力 passive left in a save has no effect',()=>{const c=actual('dark'),before=JSON.stringify(e.stats(c,time));const id=Object.keys(catalog.skills).find(k=>/^潛力/.test(catalog.skills[k].lwCategory||'')&&catalog.skills[k].type==='passive'&&catalog.skills[k].lwClasses.includes('dark'));c.skills.push(id);assert.equal(JSON.stringify(e.stats(c,time)),before);});
 }
 console.log(`PASS ${checks} W skill integration checks`);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
