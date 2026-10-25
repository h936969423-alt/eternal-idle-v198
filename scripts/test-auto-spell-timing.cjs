const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'spell-timing-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
const e=require(path.join(dir,'engine.js')),a=require(path.join(dir,'auto-config.js')),p=require(path.join(dir,'polymorph.js')),m=require(path.join(dir,'monster-config.js')),sync=require(path.join(dir,'state-sync.js')),time=1000000;
function fixture(cls='elf'){
 const allocation={},base=e.BASES[cls];let left=base.pts;for(const key of ['str','dex','con','int','wis','cha']){allocation[key]=Math.min(left,20-base[key]);left-=allocation[key];}
 const c=e.createCharacter('施法測試',cls,'m',allocation,time),s=e.emptySave(time);s.characters=[c];s.active=c.id;
 c.lv=99;c.attrs.con=100000;c.attrs.wis=60;c.autoPotion=false;c.skills=['sk_elf_triple','sk_elf_soul','sk_heal1','sk_blaze'];c.bag={};
 const bow='lw_equipment_470',arrow=Object.keys(e.DATA.items).find(id=>e.DATA.items[id].isArrow);
 c.equipment={weapon:{id:bow,en:0}};c.bag[arrow]=1000000;c.autoConfig={...a.autoConfig(c),attack:'sk_elf_triple',heal:'',convert:'',opener:'',mpAbove:0,openerMpAbove:0,aux:{},buffs:[]};c.running=true;
 e.ensureArena(c,()=>.5,time);for(const target of c.arena){target.definition={...m.defaultMonster(target.id),hp:100000000,hpRegen:0,damageMin:0,damageMax:0,spells:[]};target.hp=target.maxHp=100000000;}
 c.hp=e.stats(c,time).maxHp;c.mp=e.stats(c,time).maxMp;return {s,c,arrow};
}
const casts=(c,id)=>c.events.filter(x=>x.kind==='magic'&&x.skill===id);
const run=(s,end)=>e.advance(s,end,()=>.5);
try{
 // Triple is three full weapon attacks, using one arrow and one MP payment.
 const {playerStrike}=require(path.join(dir,'attack-rules.js')),runtime=require(path.join(dir,'monster-runtime.js')),supplies=require(path.join(dir,'auto-supplies.js')),spellRules=require(path.join(dir,'spell-rules.js')),affix=require(path.join(dir,'affix-rules.js'));
 const summary=require(path.join(dir,'magic.js')).skillSummary('sk_elf_triple');assert.ok(summary.includes('3 次完整普攻')&&summary.includes('1 支箭')&&summary.includes('70 毫秒'));
 const seeded=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(const size of ['S','L']){
  const {c,arrow}=fixture();c.bag={[arrow]:1};c.buffs.triple_crit_test={until:time+100000,d:{rangedCrit:50}};
  const target=c.arena[0],base=e.DATA.mobs[target.id],oldSize=base.s,oldElement=base.e;base.s=size;base.e='earth';
  target.effects={vulnerable:{until:time+100000,value:50}};c.affixes={[c.equipment.weapon.id]:{key:'families',name:'',value:0,element:{element:'fire',tier:1}}};
  const stats=e.stats(c,time),mob=runtime.monsterData(c,target.id,target),ammo=e.DATA.items[arrow];
  let seed=1,expected=[];for(;seed<10000;seed++){const rng=seeded(seed);expected=Array.from({length:3},()=>playerStrike(c,stats,mob,rng,ammo,time));if(expected.some(x=>x.miss)&&expected.some(x=>x.critical)&&expected.some(x=>!x.miss&&!x.critical))break;}
  assert.ok(seed<10000,'fixture exercises MISS, critical and normal hits independently');
  const beforeMp=c.mp,beforeHp=target.hp;e.cast(c,'sk_elf_triple',time,seeded(seed));
  const shots=c.events.filter(x=>x.kind==='attack'&&x.skill==='sk_elf_triple');assert.equal(shots.length,3);assert.deepEqual(shots.map(x=>x.at-time),[0,70,140]);
  assert.deepEqual(shots.map(x=>!!x.miss),expected.map(x=>x.miss));assert.deepEqual(shots.map(x=>!!x.critical),expected.map(x=>!!x.critical));
  const damage=expected.map(x=>x.miss?0:Math.floor(Math.max(1,x.damage*1.5*affix.weaponElementMultiplier(c,mob.e)*(mob.dmgTakenMult||1))));
  assert.deepEqual(shots.map(x=>x.damage),damage,'each arrow includes the full bow+ammo roll, vulnerability and elemental modifier');assert.equal(target.hp,beforeHp-damage.reduce((a,b)=>a+b,0));
  assert.equal(supplies.arrowCount(c),0);assert.equal(beforeMp-c.mp,spellRules.skillMpCost(e.DATA.skills.sk_elf_triple,stats));base.s=oldSize;base.e=oldElement;
 }
 {const {c,arrow}=fixture();c.bag={[arrow]:1};e.cast(c,'sk_elf_triple',time,()=>0);assert.equal(c.events.filter(x=>x.kind==='attack'&&x.skill==='sk_elf_triple'&&x.miss).length,3);assert.equal(supplies.arrowCount(c),0,'all misses still consume one arrow');}
 for(const locked of [false,true]){const {c,arrow}=fixture();c.bag=locked?{[arrow]:1}:{};if(locked)c.locked=[arrow];const before=JSON.stringify({mp:c.mp,bag:c.bag,seq:c.eventSeq});assert.throws(()=>e.cast(c,'sk_elf_triple',time,()=>.5),/1 支/);assert.equal(JSON.stringify({mp:c.mp,bag:c.bag,seq:c.eventSeq}),before);assert.equal(c.spellCooldowns,undefined);}
 {const {c,arrow}=fixture();c.bag={[arrow]:1};c.arena[0].hp=1;e.cast(c,'sk_elf_triple',time,()=>.5);const shots=c.events.filter(x=>x.kind==='attack'&&x.skill==='sk_elf_triple');assert.equal(shots.length,1);assert.equal(shots[0].damage,1);assert.equal(supplies.arrowCount(c),0,'lethal first hit spends no extra arrows and emits no phantom damage');}
 {const {c,arrow}=fixture();c.bag={[arrow]:1};const weapon=e.DATA.items[c.equipment.weapon.id],old=weapon.attackProc;weapon.attackProc={skill:'sk_blaze',rate:100};e.cast(c,'sk_elf_triple',time,()=>.5);assert.equal(c.events.filter(x=>x.kind==='magic'&&x.weaponProc&&x.skill==='sk_blaze').length,3,'each full attack can trigger its weapon magic');assert.equal(supplies.arrowCount(c),0);if(old)weapon.attackProc=old;else delete weapon.attackProc;}
 {const {s,c,arrow}=fixture();c.autoConfig.attack='';const target=c.arena[0],before=target.hp,b= e.stats(c,time),normal=playerStrike(c,b,runtime.monsterData(c,target.id,target),()=>.5,e.DATA.items[arrow],time);e.advance(s,time+3600,()=>.5);const shots=c.events.filter(x=>x.kind==='attack'&&!x.skill&&x.source==='physical');assert.equal(shots.length,3);assert.deepEqual(shots.map(x=>x.damage),[normal.damage,normal.damage,normal.damage]);assert.equal(target.hp,before-normal.damage*3);assert.equal(supplies.arrowCount(c),1000000-3,'ordinary attacks still consume one arrow per attack');}
 console.log('PASS: three independent full normal attacks; mixed MISS/critical/normal; small/large targets; full bow+ammo damage; vulnerability and element; one arrow/one MP charge; zero/locked arrows; early kill; per-hit weapon procs.');
 let {s,c}=fixture();run(s,time+3000);assert.deepEqual(casts(c,'sk_elf_triple').map(x=>x.at-time),[100,1400,2600]);
 const arrows=c.events.filter(x=>x.kind==='attack'&&x.skill==='sk_elf_triple');assert.deepEqual(arrows.slice(0,3).map(x=>x.at-time),[100,170,240]);assert.equal(arrows.length,9);assert.ok(c.events.some(x=>x.kind==='attack'&&!x.skill),'ordinary attacks continue alongside spells');
 ({s,c}=fixture());c.poly={id:p.POLYMORPH.forms.find(f=>f.name==='死亡騎士').id,until:time+100000};run(s,time+3000);assert.deepEqual(casts(c,'sk_elf_triple').map(x=>x.at-time),[100,1700]);
 // Old interval settings cannot alter the cycle after the control is removed.
 ({s,c}=fixture());c.autoConfig.tripleIntervalMs=500;
 assert.equal(a.autoConfig(c).tripleIntervalMs,undefined);
 assert.equal(a.validateAutoConfig(c,{tripleIntervalMs:500}).tripleIntervalMs,undefined);
 run(s,time+3000);assert.deepEqual(casts(c,'sk_elf_triple').map(x=>x.at-time),[100,1400,2600]);
 // A slow normal attack must occur before another automatic triple, including after reload.
 ({s,c}=fixture());c.buffs.cycle_slow={until:time+100000,d:{atkSpdPct:-60}};
 run(s,time+2000);assert.equal(casts(c,'sk_elf_triple').length,1);assert.equal(c.tripleNeedsNormal,true);
 const cycleSave=JSON.parse(JSON.stringify(sync.persistedSave(s)));assert.equal(cycleSave.characters[0].tripleNeedsNormal,true);
 const restoredCycle=cycleSave.characters[0];run(cycleSave,time+3500);
 assert.deepEqual(casts(restoredCycle,'sk_elf_triple').map(x=>x.at-time),[100,3200]);assert.ok(restoredCycle.events.some(x=>x.kind==='attack'&&!x.skill&&x.at===time+3000));
 ({s,c}=fixture());e.advance(s,time+3000,()=>0);assert.ok(c.events.some(x=>x.kind==='attack'&&!x.skill&&x.miss));assert.deepEqual(casts(c,'sk_elf_triple').map(x=>x.at-time),[100,1400,2600],'missed normals still release the next triple');
 // Only ordinary attacks release the cycle.

 ({s,c}=fixture());run(s,time+3000);const ordered=c.events.filter(x=>x.kind==='attack'&&!x.skill||x.kind==='magic'&&x.skill==='sk_elf_triple').sort((x,y)=>x.at-y.at||x.seq-y.seq);
 assert.deepEqual(ordered.map(x=>x.skill?'triple':'normal'),['triple','normal','triple','normal','triple']);
 ({s,c}=fixture());c.mp=0;run(s,time+2600);assert.equal(casts(c,'sk_elf_triple').length,0);assert.ok(c.events.filter(x=>x.kind==='attack'&&!x.skill).length>=2,'MP shortage never blocks normal attacks');
 ({s,c}=fixture());c.mp=0;c.autoConfig.convert='sk_elf_soul';run(s,time+2600);assert.deepEqual(casts(c,'sk_elf_soul').map(x=>x.at-time),[100,1300,2500]);assert.deepEqual(casts(c,'sk_elf_triple').map(x=>x.at-time),[100,1400,2600],'conversion does not occupy attack cooldown; triple waits for the normal arrow');
 ({s,c}=fixture());c.hp=e.stats(c,time).maxHp*.5;c.mp=100;c.autoConfig.heal='sk_heal1';c.autoConfig.convert='sk_elf_soul';run(s,time+100);assert.equal(casts(c,'sk_heal1').length,1);assert.equal(casts(c,'sk_elf_soul').length,1);assert.equal(casts(c,'sk_elf_triple').length,1);assert.deepEqual(Object.keys(c.spellCooldowns).sort(),['attack','convert','heal']);
 const resources=JSON.stringify({hp:c.hp,mp:c.mp,bag:c.bag,seq:c.eventSeq});assert.throws(()=>e.cast(c,'sk_elf_triple',time+200,()=>.5),/冷卻/);assert.equal(JSON.stringify({hp:c.hp,mp:c.mp,bag:c.bag,seq:c.eventSeq}),resources,'rejected casts spend nothing');
 const restored=JSON.parse(JSON.stringify(sync.persistedSave(s)));assert.deepEqual(restored.characters[0].spellCooldowns,c.spellCooldowns);assert.throws(()=>e.cast(restored.characters[0],'sk_blaze',time+200,()=>.5),/冷卻/,'another offensive spell cannot bypass shared cooldown');
 ({s,c}=fixture());e.cast(c,'sk_elf_triple',time+50,()=>.5);run(s,time+1400);assert.deepEqual(casts(c,'sk_elf_triple').map(x=>x.at-time),[50,1400],'manual and auto use the same attack channel');
 ({s,c}=fixture());c.mp=0;run(s,time+100);assert.equal(casts(c,'sk_elf_triple').length,0);assert.equal(c.spellCooldowns,undefined);c.mp=15;run(s,time+200);assert.equal(casts(c,'sk_elf_triple')[0].at,time+200,'MP recovery retries on next 100ms tick');
 ({s,c}=fixture());delete c.autoConfig;c.autoSkills=['sk_elf_triple'];c.mp=15;run(s,time+5100);assert.equal(casts(c,'sk_elf_triple').length,0,'legacy autoSkills must respect the MP threshold, including five-second buff checks');
 ({s,c}=fixture());c.mp=0;c.hp=40;c.autoConfig.convert='sk_elf_soul';c.autoConfig.convertHpAbove=0;run(s,time+100);assert.equal(casts(c,'sk_elf_soul').length,0);assert.equal(c.spellCooldowns,undefined,'failed HP conversion does not reserve a cooldown');
 ({s,c}=fixture());c.locked=Object.keys(c.bag);const lockedMp=c.mp;run(s,time+100);assert.equal(casts(c,'sk_elf_triple').length,0);assert.equal(c.mp,lockedMp);assert.equal(c.spellCooldowns,undefined,'locked arrows cannot consume MP or start cooldown');
 ({s,c}=fixture('mage'));c.autoConfig.attack='sk_blaze';run(s,time+2300);assert.deepEqual(casts(c,'sk_blaze').map(x=>x.at-time),[100,1100,2100],'generic offensive magic uses class speed too');
 ({s,c}=fixture());c.running=false;run(s,time+3000);assert.equal(casts(c,'sk_elf_triple').length,0,'stopped characters do not auto-cast');
 ({s,c}=fixture());c.buffs.status_silence={until:time+550,d:{silence:1}};run(s,time+800);assert.deepEqual(casts(c,'sk_elf_triple').map(x=>x.at-time),[600],'silence expires without a five-second wait');
 ({s,c}=fixture());c.autoConfig.opener='sk_blaze';run(s,time+100);assert.equal(casts(c,'sk_blaze').length,1);assert.equal(casts(c,'sk_elf_triple').length,0);c.arena[0].hp=0;run(s,time+300);assert.equal(casts(c,'sk_blaze').length,1,'target changes do not reset cooldown');run(s,time+1400);assert.equal(casts(c,'sk_blaze').length,2);assert.equal(casts(c,'sk_blaze').at(-1).at,time+1300);
 // Polls on either side of a tick boundary must neither duplicate nor omit casts.
 const one=fixture(),split=structuredClone(one);run(one.s,time+3800);for(const dt of [49,99,100,101,350,1000,1250,1300,1999,2600,3800])run(split.s,time+dt);assert.deepEqual(casts(one.c,'sk_elf_triple').map(x=>x.at),casts(split.c,'sk_elf_triple').map(x=>x.at));
 ({s,c}=fixture());c.autoConfig.convert='sk_elf_soul';c.mp=0;const started=performance.now();for(let until=time+1000;until<=time+1200000;until+=1000)run(s,until);const elapsed=performance.now()-started;assert.ok(c.running);assert.ok(c.eventSeq>3000,'online polling exercises continuous spell casts');assert.ok(elapsed<5000,`20-minute combat batch took ${elapsed}ms`);assert.ok(c.events.length<=160);
 console.log(`PASS: 100ms retry; triple-normal cycle; elf 1200ms / DK 1600ms; 70ms arrows; independent healing/conversion; no cooldown resource loss; manual/auto sharing; reload; target switch; silence; poll boundaries; ordinary attacks; 20-minute online polling ${elapsed.toFixed(0)}ms.`);
}finally{fs.rmSync(dir,{recursive:true,force:true});}

