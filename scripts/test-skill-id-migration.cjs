const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'skill-id-migration-'));
(async()=>{try{
 fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
 for(const name of fs.readdirSync(path.join(root,'lib/game'))){const p=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(p,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
 const visuals=require(path.join(dir,'magic-visuals.js'));for(const old of ['sk_meteor','sk_disintegrate']){const visual=visuals.magicVisual({skill:old});assert(visual.config?.atlas,old+' keeps its composited target atlas');}
 const disk=JSON.parse(fs.readFileSync(path.join(root,'lib/game/gamedata.json'),'utf8')),e=require(path.join(dir,'engine.js')),m=require(path.join(dir,'skill-id-migration.js')),store=require(path.join(dir,'skill-id-migration-store.js')),w=require(path.join(dir,'lineagew-skill-data.js')),auto=require(path.join(dir,'auto-config.js')),statuses=require(path.join(dir,'active-status.js')),hunt=require(path.join(dir,'offline-hunt-sample.js'));
 // legacy-skills-v2: the 69 original skills are played with their old rules and ids again; Lineage W
 // ordinary/class skills without an old version are removed; 潛力/攻城 skills are unchanged.
 assert.equal(Object.keys(w.W_LEGACY).length,69);assert.equal(Object.keys(w.W_REVERTED).length,69);assert.equal(w.W_REMOVED.size,116);assert.equal(Object.keys(w.W_SKILLS).length,46);
 for(const old of Object.keys(w.W_LEGACY))assert(disk.skills[old],old+' definition restored');
 for(const item of Object.values(disk.items))if(item.type==='skillbk')assert(e.DATA.skills[w.canonicalWSkill(item.sk)],'every book still teaches a skill: '+item.sk);
 const time=1000000;
 function fixture(cls='knight'){
  const allocation={};let left=e.BASES[cls].pts;for(const key of ['str','dex','con','int','wis','cha']){allocation[key]=Math.min(left,20-e.BASES[cls][key]);left-=allocation[key];}
  const c=e.createCharacter('轉換測試',cls,'m',allocation,time),s=e.emptySave(time);s.characters=[c];s.active=c.id;s.skillIdVersion='canonical-skills-v1';c.lv=90;c.gold=4321;c.bag.bk_counter_barrier=2;c.bank.bk_spike_armor=3;return {s,c};
 }
 const catalog=require(path.join(root,'lib/game/lineagew-skills.json')).skills;
 for(const [old,id]of Object.entries(w.W_LEGACY)){
  const {s,c}=fixture(catalog[id].lwClasses[0]);c.skills=[id,old];c.autoSkills=[id];c.skillCooldowns={[id]:time+9000,[old]:time+1000};c.buffs[id]={until:time+20000,d:{lwShield:100}};
  const before=JSON.stringify(s),result=m.prepareSkillIdMigration(s),ch=result.save.characters[0];
  assert.equal(JSON.stringify(s),before,'pure conversion');assert.deepEqual(ch.skills,[old]);assert.equal(ch.skillCooldowns[old],time+9000,'the later timer is kept');assert(!ch.skillCooldowns[id]);assert(!ch.buffs[id]);
  const def=e.DATA.skills[old];if(def.type!=='buff'&&old!=='sk_abs_barrier')assert(!ch.buffs[old],'only effect-type old skills keep running: '+old);else{assert.equal(ch.buffs[old].until,time+20000,'remaining time kept');assert(!('lwShield' in ch.buffs[old].d),'old modifiers replace the Lineage W ones');}
  assert.equal(result.save.at,time);assert.deepEqual(ch.bag,c.bag);assert.deepEqual(ch.bank,c.bank);assert.equal(ch.gold,c.gold);assert.equal(m.prepareSkillIdMigration(result.save).save,result.save,'idempotent');
 }
 // Removed skills leave learned skills, automation, effects and timers; kept 潛力 skills stay.
 const removed=[...w.W_REMOVED].find(id=>catalog[id].lwClasses.includes('knight')&&catalog[id].type==='buff'),kept=Object.keys(w.W_SKILLS).find(id=>w.W_SKILLS[id].lwClasses.includes('knight'));
 const {s,c}=fixture();c.skills=['lw_skill_440','sk_spike_armor',removed,kept];c.autoConfig={...auto.autoConfig(c),buffs:['lw_skill_440',removed]};c.autoSkills=['lw_skill_440',removed];c.buffs.lw_skill_440={until:time+1000,d:{lwCounterChance:20}};c.buffs[removed]={until:time+9000,d:{}};c.skillCooldowns={lw_skill_440:time+15000,[removed]:time+15000};c.offlineHunt=[{key:hunt.huntSetupKey(c),zone:c.zone,sampleMs:600000,kills:100,gold:5000}];
 const migrated=m.prepareSkillIdMigration(s).save,ch=migrated.characters[0];
 assert.deepEqual(ch.skills,['sk_counter_barrier','sk_spike_armor',kept]);assert.deepEqual(ch.autoConfig.buffs,['sk_counter_barrier']);assert(!ch.buffs[removed]&&!ch.skillCooldowns[removed]);assert.equal(ch.skillCooldowns.sk_counter_barrier,time+15000);assert.equal(ch.buffs.sk_counter_barrier.until,time+1000);
 assert.equal(ch.offlineHunt[0].key,hunt.huntSetupKey(ch));assert.equal(ch.offlineHunt[0].sampleMs,600000);assert.equal(ch.offlineHunt[0].gold,5000);
 // Books of removed skills are taken out and refunded.
 {const book=Object.keys(e.DATA.items).find(id=>e.DATA.items[id].sk===removed),{s,c}=fixture();assert(book,'removed skill has a book');c.bag[book]=2;const gold=c.gold;require(path.join(dir,'retired-items.js')).retireItems(s,time);assert(!c.bag[book]);assert(c.gold>=gold);}
 // An active 絕對屏障 from the Lineage W period stays invulnerable and still blocks actions.
 {const {s,c}=fixture('mage');c.skills=['lw_skill_390','lw_skill_10'];c.buffs.lw_skill_390={until:time+7000,d:{invulnerable:1,lwActionLock:1}};c.buffs.status_action_lock={until:time+7000,d:{}};const ch=m.prepareSkillIdMigration(s).save.characters[0];assert.deepEqual(ch.skills,['sk_abs_barrier','sk_lightarrow']);assert(ch.buffs.sk_abs_barrier.d.invulnerable);assert.equal(ch.buffs.status_action_lock.until,time+7000);ch.mp=10000;assert.throws(()=>e.cast(ch,'sk_lightarrow',time,()=>.5),/無法施法/);}
 // Atomic backup with retry: a competing writer's latest gold must survive, and
 // the backup must be that exact payload rather than a stale migration attempt.
 const original=JSON.stringify(s),latest=JSON.parse(original);latest.characters[0].gold=9999;let row={payload:JSON.stringify(latest),revision:8},backup,batches=0;
 const db={prepare(sql){return {bind(...args){return {sql,args,async first(){return row;}};}};},async batch(statements){batches++;const [update,insert]=statements;if(update.args[3]!==row.revision)return [{meta:{changes:0}},{meta:{changes:0}}];backup=insert.args;row={payload:update.args[0],revision:row.revision+1};return [{meta:{changes:1}},{meta:{changes:1}}];}};
 const result=await store.ensureSkillIdMigration(db,'owner',{payload:original,revision:7},time+100);assert.equal(batches,2);assert.equal(backup[2],JSON.stringify(latest));assert.equal(backup[3],8);assert.equal(JSON.parse(result.payload).characters[0].gold,9999);assert.equal(JSON.parse(result.payload).at,time);await store.ensureSkillIdMigration(db,'owner',result);assert.equal(batches,2);
 const route=fs.readFileSync(path.join(root,'app/api/game/route.ts'),'utf8');const migration=route.indexOf('row=await ensureSkillIdMigration'),read=route.indexOf('const prior=parsedSave(row)');assert(migration>=0&&read>migration,'skill migration must precede reading the cached authoritative save');
 console.log('PASS: 69 skills back to their old ids/rules with old modifiers; 116 removed skills, effects, timers and books taken out; 潛力 kept; action lock, offline sample preservation, exact backup and CAS retry.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}})().catch(error=>{console.error(error);process.exitCode=1;});
