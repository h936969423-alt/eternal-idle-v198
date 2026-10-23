const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'spell-timing-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
const e=require(path.join(dir,'engine.js')),a=require(path.join(dir,'auto-config.js')),p=require(path.join(dir,'polymorph.js')),m=require(path.join(dir,'monster-config.js')),sync=require(path.join(dir,'state-sync.js')),time=1000000;
function fixture(cls='elf'){
 const allocation={},base=e.BASES[cls];let left=base.pts;for(const key of ['str','dex','con','int','wis','cha']){allocation[key]=Math.min(left,20-base[key]);left-=allocation[key];}
 const c=e.createCharacter('施法測試',cls,'m',allocation,time),s=e.emptySave(time);s.characters=[c];s.active=c.id;
 c.lv=99;c.attrs.con=100000;c.attrs.wis=60;c.autoPotion=false;c.skills=['sk_elf_triple','sk_elf_soul','sk_heal1','sk_blaze'];c.bag={};
 const bow=Object.keys(e.DATA.items).find(id=>e.DATA.items[id].type==='wpn'&&e.DATA.items[id].isBow),arrow=Object.keys(e.DATA.items).find(id=>e.DATA.items[id].isArrow);
 c.equipment={weapon:{id:bow,en:0}};c.bag[arrow]=1000000;c.autoConfig={...a.autoConfig(c),attack:'sk_elf_triple',heal:'',convert:'',opener:'',mpAbove:0,openerMpAbove:0,aux:{},buffs:[]};c.running=true;
 e.ensureArena(c,()=>.5,time);for(const target of c.arena){target.definition={...m.defaultMonster(target.id),hp:100000000,hpRegen:0,damageMin:0,damageMax:0,spells:[]};target.hp=target.maxHp=100000000;}
 c.hp=e.stats(c,time).maxHp;c.mp=e.stats(c,time).maxMp;return {s,c,arrow};
}
const casts=(c,id)=>c.events.filter(x=>x.kind==='magic'&&x.skill===id);
const run=(s,end)=>e.advance(s,end,()=>.5);
try{
 const f=require(path.join(dir,'magic-formulas.js')),r=require(path.join(dir,'spell-rules.js'));
 for(const [int,expected] of [[25,[4,2,6,16,0]],[40,[8,8,10,26,2]],[60,[15,18,15,30,7]]]){
  const b=f.magicIntBonuses(int);assert.deepEqual(Object.values(b),expected);
  for(const cls of ['knight','mage','elf','dark']){const {c}=fixture(cls);c.equipment={};c.attrs.int=int;const st=e.stats(c,time);for(const key of ['mdmg','sp','magicHit','magicCrit','mpReduce'])assert.equal(st[key],b[key],cls+key);}
 }
 assert.deepEqual(f.magicIntBonuses(200),f.magicIntBonuses(75));
 for(const [mr,expected]of [[0,1],[10,.95],[60,.7],[100,.5],[200,.4],[600,0]])assert.equal(f.spellMrMultiplier(mr),expected);
 const b={...f.magicIntBonuses(40),int:40},spell={dmgDice:[1,6],tier:1};
 assert.equal(r.spellDamage(spell,b,{mr:0},()=>.5,'elf'),23);
 assert.equal(r.spellDamage(spell,b,{mr:0},()=>.5,'mage'),35);
 assert.equal(r.spellDamage(spell,b,{mr:100},()=>.5,'mage'),17);
 const crit={critical:false};assert.equal(r.spellDamage(spell,{...b,magicCrit:100},{mr:0},()=>.5,'mage',crit),45);assert.equal(crit.critical,true);
 assert.equal(r.spellDamage({...spell,ele:'fire'},b,{mr:0,e:'earth'},()=>.5,'elf'),29);
 assert.equal(r.healingAmount(e.DATA.skills.sk_heal1,{...b,sp:9999},999,()=>0),35);
 assert.equal(r.healingAmount(e.DATA.skills.sk_heal1,b,999,()=>.999),35);
 assert.equal(r.healingAmount(e.DATA.skills.sk_heal2,b,999,()=>0),243);
 assert.equal(r.healingAmount(e.DATA.skills.sk_full_heal,b,999,()=>0),389);
 assert.equal(r.healingAmount(e.DATA.skills.sk_elf_lifespring,b,999,()=>0),672);
 assert.equal(r.healingAmount(e.DATA.skills.sk_heal2,b,10,()=>0),10);
 assert.equal(r.skillMpCost({mp:20},b),15);assert.equal(r.skillMpCost({mp:1},{mpReduce:100}),1);
 assert.equal(r.abnormalHit(1,{magicHit:0},{lv:99,mr:100},()=>.999),true);assert.equal(r.abnormalHit(99,{magicHit:99},{lv:1,mr:0},()=>0),false);
 {const {c}=fixture('mage');c.skills.push('sk_regen');c.hp=1;e.cast(c,'sk_regen',time,()=>.5);assert.equal(c.hp,1);assert.equal(c.healingOverTime.remaining,5);const save={...e.emptySave(time),characters:[c],active:c.id};for(let t=1000;t<=15000;t+=1000)e.advance(save,time+t,()=>.5);assert.equal(c.healingOverTime,undefined);assert.deepEqual(c.events.filter(x=>x.kind==='heal'&&x.skill==='sk_regen').map(x=>x.at-time),[3000,6000,9000,12000,15000]);}
 {const {c}=fixture('mage');c.hp=1;e.cast(c,'sk_heal1',time,()=>.5);assert.equal(c.spellCooldowns.heal,time+2000);const before=c.mp;assert.throws(()=>e.cast(c,'sk_heal1',time+1999,()=>.5),/冷卻/);assert.equal(c.mp,before);}
 {const {c}=fixture('mage');c.hp=1;c.buffs.sk_haste_spell={until:time+99999,d:{}};e.cast(c,'sk_heal1',time,()=>.5);assert.equal(c.spellCooldowns.heal,time+1340);}
 {const {c}=fixture('dark');c.skills.push('sk_dark_crit');c.hp=2;c.mp=2;const hp=c.arena[0].hp;e.cast(c,'sk_dark_crit',time,()=>.5);assert.equal(c.hp,1);assert.equal(c.mp,1);assert.equal(c.skillCooldowns.sk_dark_crit,time+30000);assert.ok(c.arena[0].hp<=hp);assert.equal(c.events.find(x=>x.kind==='attack'&&x.skill==='sk_dark_crit').critical,true);}
 {const {c}=fixture();c.skills.push('sk_vampire');c.hp=1;e.cast(c,'sk_vampire',time,()=>.5);assert.equal(c.hp,1);assert.equal(c.events.find(x=>x.kind==='attack'&&x.skill==='sk_vampire').critical,false);}
 {const {c}=fixture();c.skills.push('sk_ice_lance');e.cast(c,'sk_ice_lance',time,()=>.5);assert.equal(c.arena[0].effects?.freeze,undefined);}
 {const {c}=fixture('knight');const weapon=Object.keys(e.DATA.items).find(id=>e.DATA.items[id].wcat==='tohandsword');assert.ok(weapon);c.equipment={weapon:{id:weapon,en:0}};c.skills.push('sk_shock_stun');c.attrs.int=40;e.cast(c,'sk_shock_stun',time,()=>.5);assert.equal(c.events.filter(x=>x.kind==='attack'&&x.skill==='sk_shock_stun').length,1);assert.equal(c.arena[0].effects.stun.until,time+6000);assert.equal(c.skillCooldowns.sk_shock_stun,time+6000);assert.throws(()=>e.cast(c,'sk_shock_stun',time+5999,()=>.5),/冷卻/);}
 {const {c}=fixture('dark');c.skills.push('sk_dark_armorbreak','sk_lightarrow');c.attrs.int=40;e.cast(c,'sk_dark_armorbreak',time,()=>.5);assert.equal(c.arena[0].effects.vulnerable.value,58);const st=e.stats(c,time+1500),mob=require(path.join(dir,'monster-runtime.js')).monsterData(c,c.arena[0].id,c.arena[0]),base=r.spellDamage(e.DATA.skills.sk_lightarrow,st,mob,()=>.5,'dark');e.cast(c,'sk_lightarrow',time+1500,()=>.5);assert.equal(c.events.findLast(x=>x.kind==='attack').damage,Math.floor(base*1.58));}
 {const {c}=fixture();const strike=require(path.join(dir,'attack-rules.js')).playerStrike;const id='lw_equipment_903100';assert.ok(id);c.equipment={weapon:{id,en:0}};const st={...e.stats(c,time),meleeCrit:0,doubleChance:0},mob={lv:1,ac:10,dr:0};c.buffs.sk_dark_double={until:time+1000,d:{}};const yes=strike(c,st,mob,()=>.199,undefined,time,{forceHit:true}),no=strike(c,st,mob,()=>.2,undefined,time,{forceHit:true});delete c.buffs.sk_dark_double;const baseline=strike(c,st,mob,()=>.199,undefined,time,{forceHit:true});assert.equal(yes.damage,baseline.damage*2);assert.equal(no.damage,baseline.damage);}
 {const legacy={int:40,sp:4,mdmg:2,magicCrit:0},augmented={...legacy,intMagicApplied:1};for(const k of ['sp','mdmg','magicCrit'])augmented[k]+=f.magicIntBonuses(40)[k];assert.deepEqual(f.legacyProcStats(augmented),{...legacy,intMagicApplied:1});const w=require(path.join(dir,'weapon-magic.js')),def=require(path.join(dir,'weapon-proc-skills.json')).sk_blaze;assert.equal(w.weaponMagicDamage(def,legacy,{mr:20},()=>.5),w.weaponMagicDamage(def,augmented,{mr:20},()=>.5));}

 function incoming({magic=false,dodge=false,barrier=false,dr=0}={}){const {c,s}=fixture('dark');c.autoConfig.attack='';c.equipment={};c.buffs.incoming_test={until:time+10000,d:{er:-1000,ac:-1000,dr}};if(dodge)c.buffs.sk_dark_dodge={until:time+10000,d:{}};if(barrier)c.buffs.sk_magic_shield={until:time+10000,d:{magicBarrier:1}};for(const target of c.arena)target.definition.damageMax=target.definition.damageMin=0;const target=c.arena[0];target.definition.lv=999;target.definition.attackInterval=1;if(magic)target.definition.spells=[{id:'sk_lightarrow',min:100,max:100,element:'none',mp:0,chance:100,cooldown:1,duration:1,value:0,hpBelow:100,enabled:true}];else target.definition.damageMin=target.definition.damageMax=100;e.advance(s,time+1000,()=>.1);return {c,hits:c.events.filter(x=>x.kind==='hurt')};}
 {const plain=incoming(),dodged=incoming({dodge:true});assert.ok(plain.hits.length&&plain.hits[0].damage>0);assert.equal(dodged.hits[0].damage,0);assert.ok(dodged.c.buffs.sk_dark_dodge);assert.equal(dodged.c.skillCooldowns?.sk_dark_dodge,undefined);const spell=incoming({magic:true}),protectedSpell=incoming({magic:true,dodge:true});assert.ok(spell.hits[0].damage>0);assert.equal(protectedSpell.hits[0].damage,spell.hits[0].damage);assert.equal(incoming({magic:true,dr:5}).hits[0].damage,spell.hits[0].damage-5);const shielded=incoming({barrier:true});assert.equal(shielded.hits[0].damage,0);assert.equal(shielded.c.buffs.sk_magic_shield,undefined);assert.equal(shielded.c.magicBarrierCooldown,time+4000);}
 console.log('PASS: INT table/classes/cap; magic dice, MR, mage multiplier, critical dice, elemental +6; fixed INT-only healing, five timed HoT ticks, HP cap and heal cooldown; MP and D20; shock stun, armor break, double destruction, dark critical resources; vampire/ice-lance rules; unchanged independent weapon proc formula.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
