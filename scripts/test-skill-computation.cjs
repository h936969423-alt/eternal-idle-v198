const fs=require('fs'),path=require('path'),os=require('os'),assert=require('node:assert/strict'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'skill-computation-'));
const compile=s=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
try{
 fs.writeFileSync(dir+'/package.json','{"type":"commonjs"}');for(const n of fs.readdirSync(root+'/lib/game')){const s=fs.readFileSync(root+'/lib/game/'+n);if(n.endsWith('.json'))fs.writeFileSync(dir+'/'+n,s);if(n.endsWith('.ts'))fs.writeFileSync(dir+'/'+n.replace(/\.ts$/,'.js'),compile(s.toString()));}
 fs.writeFileSync(dir+'/baseline-skill-data.js',compile(fs.readFileSync(root+'/tests/fixtures/lineagew-skill-data-before-optimization.txt','utf8')));
 const current=require(dir+'/lineagew-skill-data.js'),baseline=require(dir+'/baseline-skill-data.js'),raw=require(dir+'/gamedata.json'),engine=require(dir+'/engine.js');let comparisons=0;
 const ids=Object.keys(current.W_SKILLS),legacy=Object.keys(current.W_LEGACY),b={magicHit:37,mdmg:51};
 for(const cls of ['royal','mage','knight','elf','dark'])for(const lv of [1,30,60,80,99])for(let seed=0;seed<8;seed++){
  const available=ids.filter(id=>current.W_SKILLS[id].lwClasses.includes(cls)),skills=seed===0?[]:available.filter((id,i)=>seed===1||(i*17+seed)%7<seed),c={cls,lv,skills:[...skills,...legacy.filter((id,i)=>i%7===seed%7)],equipment:{},elfEle:seed%2?'water':'fire',elfEle2:'wind',buffs:{}};
  const context=current.wSkillContext(c);for(const id of ids){assert.equal(current.wUpgradeScale(c,id,context),baseline.wUpgradeScale(c,id),cls+' '+id+' '+seed);comparisons++;}
  assert.deepEqual(current.wPassiveBonuses(c,b,context),baseline.wPassiveBonuses(c,b));
  for(const id of available){assert.equal(current.wElementAllowed(c,current.W_SKILLS[id],context),baseline.wElementAllowed(c,baseline.W_SKILLS[id]));assert.deepEqual(current.wBuffModifiers(c,id,context),baseline.wBuffModifiers(c,id));}
 }
 // The same object and skills array change: there is no cross-request cache.
 const c={cls:'elf',lv:80,skills:[],equipment:{},elfEle:'fire',elfEle2:'water',buffs:{}};raw.items.qa_grant={req:'elf',grantSkills:['lw_skill_16970']};
 for(const change of [()=>c.skills.push('lw_skill_16970'),()=>c.skills.splice(0),()=>c.equipment.ring={id:'qa_grant'},()=>delete c.equipment.ring,()=>c.elfEle='water']){change();const ctx=current.wSkillContext(c);assert.deepEqual(ctx.ids,baseline.learnedWSkills(c));assert.deepEqual(current.wPassiveBonuses(c,b,ctx),baseline.wPassiveBonuses(c,b));for(const id of ids)assert.equal(current.wElementAllowed(c,current.W_SKILLS[id],ctx),baseline.wElementAllowed(c,baseline.W_SKILLS[id]));}
 console.log('PASS',comparisons,'upgrade equivalence comparisons, passive/buff/element formulas and live learning/equipment changes');
 let allocation={},left=engine.BASES.knight.pts;for(const k of ['str','dex','con','int','wis','cha']){allocation[k]=Math.min(left,20-engine.BASES.knight[k]);left-=allocation[k];}const actor=engine.createCharacter('測試','knight','m',allocation,1000000);actor.running=false;const save={v:1,at:1000000,active:actor.id,characters:[actor]},target=save.at+7000;
 const performanceDescriptor=Object.getOwnPropertyDescriptor(globalThis,'performance');Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>0}});
 try{let rounds=0;while(save.at<target){const before=save.at,report=engine.advance(save,target,()=>.5,undefined,200,1);assert.equal(save.at-before,1000);assert.equal(report.pendingSeconds,Math.ceil((target-save.at)/1000));rounds++;assert(rounds<=7);}assert.equal(rounds,7);assert.equal(save.catchup,undefined);}finally{Object.defineProperty(globalThis,'performance',performanceDescriptor);}
 console.log('PASS bounded online settlement completes with a frozen Worker CPU clock and preserves the exact target time');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
