const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'afei-poly-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
const e=require(path.join(dir,'engine.js')),p=require(path.join(dir,'polymorph.js')),summon=require(path.join(dir,'summon-system.js')),sync=require(path.join(dir,'state-sync.js')),now=1000000;
const reference=require('../docs/afei-polymorph/reference-20261020.json');
function character(lv=55){const b=e.BASES.mage,allocation={};let left=b.pts;for(const k of ['str','dex','con','int','wis','cha']){allocation[k]=Math.min(left,20-b[k]);left-=allocation[k];}const c=e.createCharacter('變身測試','mage','m',allocation,now);c.lv=lv;c.gold=60000000;c.bag={scroll_poly:100,ap381_armor_20281:1,...p.POLYMORPH.unlockCost.items};c.equipment={};return c;}
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
try{
 assert.equal(p.POLYMORPH.forms.length,51);
 for(const expected of reference.forms){
  const f=p.POLYMORPH.forms.find(f=>f.name===expected.name);assert.ok(f,expected.name);assert.equal(f.level,expected.level);
  assert.deepEqual(Object.fromEntries(Object.entries(f.bonus).filter(([,v])=>v)),expected.bonus,f.name+' public bonuses');
  const c=character(Math.max(1,f.level)),base=e.stats(c,now);c.poly={id:f.id,until:now+1800000};const changed=e.stats(c,now);
  for(const [k,v]of Object.entries(expected.bonus)){
   if(k==='speedPct'){close(changed.attackInterval,base.attackInterval*(1-v/100));continue;}
   const delta=k==='ac'?-v:v;close((changed[k]||0)-(base[k]||0),delta);
  }
  assert.equal(changed.maxMp,base.maxMp,f.name+' magic points are not MP capacity');
  close(changed.castIntervalMs,2000*(1-f.bonus.speedPct/100));
  c.polyLook=false;assert.deepEqual(e.stats(c,now),changed,'hiding art retains bonuses');
  c.poly.until=now;assert.deepEqual(e.stats(c,now),base,'expiration removes bonuses');
  for(const image of Object.values(f.frames).flat())assert.ok(fs.existsSync(path.join(root,'public',image)),image);
 }
 // Every level boundary uses only its own random pool; selecting permits only current/previous.
 for(const lv of [1,14,15,29,30,44,45,49,50,51,52,54,55,99]){
  const c=character(lv),band=p.polyBand(lv),randomBand=band===55?52:band;
  const pool=p.POLYMORPH.forms.filter(f=>f.level===randomBand);
  for(let n=0;n<pool.length;n++){p.usePolymorph(c,undefined,now,()=>(n+.5)/pool.length);assert.equal(p.activeForm(c,now).id,pool[n].id);}
  const selectable=new Set(p.selectableForms(c).map(f=>f.id));
  for(const f of p.POLYMORPH.forms.filter(f=>!f.crystals)){
   const before=JSON.stringify(c.bag);
   if(selectable.has(f.id))p.usePolymorph(c,f.id,now,()=>0);
   else {assert.throws(()=>p.usePolymorph(c,f.id,now),/目前與上一/);assert.equal(JSON.stringify(c.bag),before);}
  }
 }
 const c=character(),exclusive=p.POLYMORPH.forms.filter(f=>f.crystals),id=exclusive[0].id;
 for(const item of Object.keys(p.POLYMORPH.unlockCost.items)){const trial=structuredClone(c);trial.bag[item]=4;const before=JSON.stringify(trial);assert.throws(()=>p.unlockPolymorph(trial,id),/需要/);assert.equal(JSON.stringify(trial),before,'missing '+item+' must spend nothing');}
 for(const kind of ['gold','ring','level','locked']){const trial=structuredClone(c);if(kind==='gold')trial.gold--;if(kind==='ring')delete trial.bag.ap381_armor_20281;if(kind==='level')trial.lv=54;if(kind==='locked')trial.locked=['new_item_bless_wpn'];const before=JSON.stringify(trial);assert.throws(()=>p.unlockPolymorph(trial,id));assert.equal(JSON.stringify(trial),before,kind+' denial must spend nothing');}
 const save=e.emptySave(now);save.characters=[c,character(20)];save.active=c.id;p.bindPolymorphUnlocks(save);p.unlockPolymorph(c,id);assert.ok(save.characters[1].polyUnlocked.includes(id));assert.equal(c.gold,0);for(const item of Object.keys(p.POLYMORPH.unlockCost.items))assert.equal(c.bag[item],undefined);
 assert.throws(()=>p.unlockPolymorph(c,id),/已永久/);
 p.usePolymorph(c,undefined,now,()=>.99);assert.equal(c.poly.id,id,'random Lv55 excludes unowned forms');
 const reloaded=JSON.parse(JSON.stringify(sync.persistedSave(save)));p.bindPolymorphUnlocks(reloaded);assert.ok(reloaded.characters.every(c=>c.polyUnlocked.includes(id)));
 const legacy=e.emptySave(now);legacy.characters=[character(),character()];legacy.characters[0].polyUnlocked=['morph_42'];legacy.characters[1].polyUnlocked=['morph_46'];legacy.characters[0].poly={id:'morph_42',until:now+10000};legacy.characters[1].polyPreferred='morph_46';p.bindPolymorphUnlocks(legacy);assert.deepEqual(legacy.polyUnlocked,[exclusive[0].id,exclusive[4].id]);assert.equal(legacy.characters[0].poly.id,exclusive[0].id);assert.equal(legacy.characters[1].polyPreferred,exclusive[4].id);
 const empty=e.emptySave(now),fresh=character();empty.characters=[fresh];empty.active=fresh.id;e.action(empty,{type:'polyUnlock',id},now);assert.ok(empty.polyUnlocked.includes(id),'engine action binds account unlocks');
 const mage=character(),esti=exclusive.find(f=>f.name==='依詩蒂');const base=e.stats(mage,now);mage.poly={id:esti.id,until:now+10000};const bonus=e.stats(mage,now),form=summon.SUMMON_TIERS[0].mobs[0].n;const before=summon.summonNumbers(mage,form,base),after=summon.summonNumbers(mage,form,bonus);assert.equal(after.hit-before.hit,2);assert.equal(bonus.hit,base.hit,'summon hit never changes player hit');assert.equal(after.flat,before.flat);
 const dk=p.POLYMORPH.forms.find(f=>f.name==='死亡騎士');mage.poly={id:dk.id,until:now+10000};const slow=e.stats(mage,now);mage.buffs.sk_haste_spell={until:now+10000,d:{atkSpdPct:33}};const fast=e.stats(mage,now);close(slow.castIntervalMs,1600);close(fast.castIntervalMs,1072);close(fast.attackInterval,slow.attackInterval*.67);
 const renew=character(55);renew.running=true;renew.autoPoly=true;renew.polyPreferred=p.POLYMORPH.forms.find(f=>f.level===0).id;p.tickPolymorph(renew,now,()=>0);assert.equal(p.activeForm(renew,now).level,52,'out-of-band preference falls back without stalling');
 console.log('Passed: 51 public forms/stats/art, level boundaries, attack/cast speed and haste, account migration/persistence, atomic full-cost unlocks, summon-only hit and auto renewal.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
