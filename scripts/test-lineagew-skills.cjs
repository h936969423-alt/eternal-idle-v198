const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'w-skills-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
let checks=0;const check=(name,fn)=>{fn();checks++;console.log('PASS',name);};
try{
 for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true},reportDiagnostics:true}).outputText);}
 const data=require(path.join(dir,'lineagew-skill-data.js')),runtime=require(path.join(dir,'lineagew-skill-runtime.js')),access=require(path.join(dir,'skill-access.js')),book=process.env.W_SKILLS_UNIT_ONLY==='1'?null:require(path.join(dir,'skill-book.js'));
 // Since legacy-skills-v2 only the 潛力/攻城 Lineage W skills are in play; the 69 reverted skills keep
 // their W icons and books. W_SKILLS_NO_ASSETS=1 skips file-existence checks where assets are not restored.
 const all=data.W_SKILLS,raw=require(path.join(dir,'gamedata.json')),entries=Object.entries(all),catalog=JSON.parse(fs.readFileSync(path.join(root,'lib/game/lineagew-skills.json'),'utf8'));
 const exists=p=>process.env.W_SKILLS_NO_ASSETS==='1'||fs.existsSync(path.join(root,'public',p));
 check('Kept 潛力/攻城 catalogue, its books and every icon still in use',()=>{
  const kept=Object.entries(catalog.skills).filter(([,s])=>/^(潛力|攻城)/.test(s.lwCategory||''));assert.equal(entries.length,kept.length);assert.equal(entries.length,46);
  assert.equal(Object.keys(data.W_BOOKS).length,Object.values(catalog.books).filter(b=>!data.W_REMOVED.has(b.sk)).length);
  for(const cls of ['royal','mage','knight','elf','dark']){const c={cls,skills:[]};const count=entries.filter(([,s])=>s.lwClasses.includes(cls)).length;if(book)assert.equal(book.bookSections(c).flatMap(g=>g.tiers.flatMap(t=>t.slots.filter(Boolean))).length,count,cls);}
  for(const [id,s] of entries){assert.ok(s.lwSourceId&&s.lwRuleVersion);assert.ok(['buff','atk','heal','convert','manual','passive'].includes(s.type),id);if(s.lwIcon)assert.ok(exists(s.lwIcon),id);if(s.lwUpgradeOf)assert.ok(all[s.lwUpgradeOf]);}
  for(const id of Object.keys(data.W_REVERTED)){const icon=catalog.skills[id].lwIcon;if(icon)assert.ok(exists(icon),id+' icon kept for the reverted skill');}
 });
 check('Book appearances: verified item icons and fallbacks for kept and reverted skills',()=>{
  const iconMap=require(path.join(dir,'asset-map.json')).icons;
  const books=Object.values(data.W_BOOKS),real=books.filter(b=>b.lwItemIconSource),missing=books.filter(b=>b.lwItemIconMissing);
  assert.ok(real.length>0);
  for(const item of real){assert.ok(item.lwItemIconSource.includes('/Item/'));assert.notEqual(item.lwIcon,catalog.skills[item.sk].lwIcon);assert.equal(iconMap.items[item.n],item.lwIcon);assert.ok(exists(item.lwIcon));}
  for(const item of missing)assert.equal(item.lwIcon,catalog.skills[item.sk].lwIcon);
  for(const item of Object.values(raw.items).filter(i=>i.type==='skillbk'&&data.W_REVERTED[i.sk])){const match=real.find(b=>b.sk===item.sk);if(match)assert.equal(iconMap.items[item.n],match.lwIcon);}
 });
 const time=1_000_000;
 const b={maxHp:50000,maxMp:50000,mdmg:10,magicHit:10,int:20,mpReduce:0,castIntervalMs:500,healIntervalMs:500};
 function fixture(id){const s=all[id],cls=s.lwClasses[0],c={cls,lv:99,skills:entries.filter(([,x])=>x.lwClasses.includes(cls)).map(([key])=>key),equipment:{},bag:{},buffs:{},hp:25000,mp:50000,lawful:32767,elfEle:s.reqEle||'fire',elfEle2:'water',arenaTarget:0,zone:'training',arena:['A','B','C'].map(uid=>({uid,id:'mob',hp:10000,mp:100,maxHp:10000}))},events=[],hits=[];
  const h={definition:()=>({n:'test',lv:50,mr:0,un:true}),physical:()=>({damage:10,miss:false}),magic:()=>12,hit:(t,damage,skill,source)=>{const dealt=Math.min(t.hp,Math.floor(damage));t.hp-=dealt;hits.push({uid:t.uid,skill,source,damage:dealt});return dealt;},heal:n=>{const before=c.hp;c.hp=Math.min(b.maxHp,c.hp+n);return c.hp-before;},event:(kind,event)=>events.push({kind,...event}),log:()=>{},teleport:()=>events.push({kind:'teleport'}),party:()=>[{hp:c.hp,maxHp:b.maxHp,apply:n=>{c.hp=Math.max(1,Math.min(b.maxHp,c.hp+n));}}],consumeArrow:()=>{},shareBuff:()=>{},weapon:{},shield:{}};
  return {c,h,events,hits};
 }
 check('Every kept active skill resolves a real effect through the production runtime',()=>{
  for(const [id,s] of entries.filter(([,s])=>s.type!=='passive')){const f=fixture(id);runtime.castWSkill(f.c,id,b,f.h,time,()=>0);assert.ok(f.events.some(e=>e.kind==='magic'),id);assert.ok(f.c.mp<=50000&&f.c.mp>=0&&f.c.hp>0,id);}
 });
 check('Lineage W-period ids resolve once to the original skill',()=>{const c={cls:'mage',skills:['sk_lightarrow','lw_skill_10'],equipment:{}};const before=JSON.stringify(c.skills);assert.equal(access.availableSkills(c).filter(id=>id==='sk_lightarrow').length,1);assert.ok(access.hasSkill(c,'sk_lightarrow'));assert.ok(access.hasSkill(c,'lw_skill_10'));assert.equal(JSON.stringify(c.skills),before);});
 check('Learned upgrades scale their base skill without repeated stacking',()=>{const [up,s]=entries.find(([,x])=>x.lwUpgradeOf);const c={cls:s.lwClasses[0],lv:90,skills:[s.lwUpgradeOf]};assert.equal(data.wUpgradeScale(c,s.lwUpgradeOf),1);c.skills.push(up);const once=data.wUpgradeScale(c,s.lwUpgradeOf);assert.ok(once>1);c.skills.push(up);assert.equal(data.wUpgradeScale(c,s.lwUpgradeOf),once);});
 check('Resource errors, passive casts and wrong class do not spend resources',()=>{const [id]=entries.find(([,x])=>x.type!=='passive'&&x.mp>0);for(const mutate of [f=>f.c.mp=0,f=>f.c.cls='dragon']){const f=fixture(id);mutate(f);const before=[f.c.hp,f.c.mp];assert.throws(()=>runtime.castWSkill(f.c,id,b,f.h,time,()=>0));assert.deepEqual([f.c.hp,f.c.mp],before);}const [passive]=entries.find(([,x])=>x.type==='passive'&&!x.lwUpgradeOf);const f=fixture(passive);assert.throws(()=>runtime.castWSkill(f.c,passive,b,f.h,time,()=>0),/被動/);});
 check('Per-skill cooldown survives save roundtrip and blocks duplicate casts',()=>{const id='lw_skill_13489',f=fixture(id);runtime.castWSkill(f.c,id,b,f.h,time,()=>0);const c=JSON.parse(JSON.stringify(f.c)),mp=c.mp;assert.throws(()=>runtime.castWSkill(c,id,b,f.h,time+1,()=>0),/冷卻/);assert.equal(c.mp,mp);});
 check('Control immunity protects bosses',()=>{const t={hp:10};assert.equal(runtime.applyWSkillStatus(t,{boss:true},{kind:'stun',seconds:3,chance:1},time,()=>0,99),false);assert.equal(t.effects,undefined);});
 if(process.env.W_SKILLS_UNIT_ONLY!=='1'){
  const e=require(path.join(dir,'engine.js'));
  function actual(cls){const allocation={};let left=e.BASES[cls].pts;for(const k of ['str','dex','con','int','wis','cha']){allocation[k]=Math.min(left,20-e.BASES[cls][k]);left-=allocation[k];}const c=e.createCharacter('技能測試',cls,'m',allocation,time);c.lv=99;c.gold=100000000;c.lawful=32767;c.hp=e.stats(c,time).maxHp;c.mp=e.stats(c,time).maxMp;return c;}
  check('Real engine buys and learns a kept 潛力 book and respects class',()=>{const c=actual('knight'),save={v:1,at:time,active:c.id,characters:[c]};c.zone='town_silver_knight';const id=Object.values(data.W_BOOKS).find(x=>all[x.sk]?.lwClasses.includes('knight')&&!all[x.sk].lwIntrinsic&&!all[x.sk].lwUpgradeOf).sk;e.action(save,{type:'buySkillBook',skill:id},time,()=>.5);assert.ok(Object.keys(c.bag).some(k=>raw.items[k]?.sk===id));e.action(save,{type:'learn',skill:id},time,()=>.5);assert.ok(access.hasSkill(c,id));});
  check('Real engine casts an original single-target spell on one encounter',()=>{const c=actual('mage');c.skills=['sk_lightarrow'];c.zone='training';e.ensureArena(c,()=>.5,time);c.arena.forEach(t=>t.hp=100000);const before=c.arena.slice(1).map(t=>t.hp);e.cast(c,'lw_skill_10',time,()=>.5);const hits=c.events.filter(x=>x.kind==='attack'&&x.skill==='sk_lightarrow');assert.ok(hits.length>=1);assert.deepEqual(c.arena.slice(1).map(t=>t.hp),before);});
  check('Real engine passive skills affect stats and duplicate learned copies do not stack',()=>{const stat=(c)=>JSON.stringify(e.stats(c,time));const c=actual('dark'),before=stat(c);const [id]=entries.find(([,s])=>s.type==='passive'&&s.lwClasses.includes('dark')&&!s.lwUpgradeOf&&Object.keys(s.lwD||{}).length);c.skills.push(id);const after=stat(c);assert.notEqual(after,before);c.skills.push(id);assert.equal(stat(c),after);});
 }
 console.log(`PASS ${checks} W skill integration checks`);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
