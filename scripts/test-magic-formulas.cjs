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
 for(const [int,expected] of [[25,[4,2,6,16,0]],[40,[8,8,10,26,2]],[60,[15,18,15,30,7]],[100,[35,32,35,30,15]]])assert.deepEqual(Object.values(f.magicIntBonuses(int)),expected);
 assert.deepEqual(f.magicIntBonuses(200),f.magicIntBonuses(100));
 for(const [mr,expected]of [[0,1],[10,.95],[100,.5],[200,.4],[400,.25],[600,.13],[800,.05],[1000,.01]])assert.ok(Math.abs(f.spellMrMultiplier(mr)-expected)<1e-12);
 const b={int:40,mdmg:8,sp:10,intMagicApplied:1,magicCrit:0,magicCritDmg:50},spell={dmgDice:[1,6],tier:1};
 assert.equal(r.spellDamage(spell,b,{mr:0},()=>.5,'elf'),25);
 assert.equal(r.spellDamage(spell,b,{mr:0},()=>.5,'mage'),25,'no invented mage multiplier');
 assert.equal(r.spellDamage(spell,b,{mr:100},()=>.5,'mage'),12);
 assert.equal(r.spellDamage({...spell,dmgBase:10},b,{mr:0},()=>.5),46,'flat skill damage is not omitted');
 const crit={critical:false};assert.equal(r.spellDamage(spell,{...b,magicCrit:100},{mr:0},()=>.5,'mage',crit),38);assert.equal(crit.critical,true);
 assert.equal(r.spellDamage({...spell,ele:'fire'},b,{mr:0,e:'earth'},()=>.5),35);
 assert.equal(r.spellDamage({...spell,multiDmg:[[1,6],[1,6]]},b,{mr:0},()=>.5),33,'character magic damage added once, with per-hit rounding');
 assert.equal(r.healingAmount(e.DATA.skills.sk_heal1,{...b,sp:9999},999,()=>0),30);
 assert.equal(r.healingAmount(e.DATA.skills.sk_heal1,b,999,()=>.999),120);
 assert.equal(r.healingAmount(e.DATA.skills.sk_heal2,b,999,()=>0),46);
 assert.equal(r.healingAmount(e.DATA.skills.sk_elf_lifespring,b,999,()=>0),999);
 assert.equal(r.skillMpCost({mp:20},{mpReduce:26}),15);
 assert.equal(r.abnormalHit(1,{magicHit:0},{lv:999,mr:100},()=>.999),true);assert.equal(r.abnormalHit(99,{magicHit:99},{lv:1,mr:0},()=>0),false);
 assert.equal(Array.from({length:20},(_,i)=>r.abnormalHit(999,{magicHit:99},{lv:1,mr:0},()=>(i+.5)/20,12)).filter(Boolean).length,12);
 {const {c}=fixture('mage');c.skills.push('sk_regen');c.hp=1;e.cast(c,'sk_regen',time,()=>.5);assert.ok(c.hp>1);assert.equal(c.healingOverTime,undefined,'source regen is an immediate group heal');}
 {const {c}=fixture('dark');c.skills.push('sk_dark_crit');const before=e.stats(c,time).maxHp;c.hp=before;c.mp=e.stats(c,time).maxMp;e.cast(c,'sk_dark_crit',time,()=>.5);assert.equal(c.hp,1,'dark critical leaves the caster at 1 HP');assert.equal(c.mp,1,'dark critical leaves the caster at 1 MP');assert.equal(c.skillCooldowns?.sk_dark_crit,time+30000,'dark critical cooldown is 30 seconds');assert.equal(c.events.find(x=>x.kind==='attack'&&x.skill==='sk_dark_crit').critical,true);}
  {const {c}=fixture('knight');const weapon=Object.keys(e.DATA.items).find(id=>e.DATA.items[id].wcat==='tohandsword');c.equipment={weapon:{id:weapon,en:0}};c.skills.push('sk_shock_stun');e.cast(c,'sk_shock_stun',time,()=>.5);assert.equal(c.events.filter(x=>x.kind==='attack'&&x.skill==='sk_shock_stun').length,1);assert.equal(c.arena[0].effects?.stun,undefined,'shock control fails its 10% gate at rng 0.5');assert.ok(c.events.some(x=>x.kind==='state'&&x.effect==='衝暈失敗'),'failed control emits target status');assert.equal(c.skillCooldowns?.sk_shock_stun,time+6000,'shock stun applies its 6-second cooldown');}
 {const {c}=fixture('dark');c.skills.push('sk_dark_armorbreak');e.cast(c,'sk_dark_armorbreak',time,()=>.5);assert.equal(c.arena[0].effects.vulnerable.value,58);}
  {const {c}=fixture('royal');c.skills=['sk_royal_kingguard','sk_royal_precise','sk_royal_burnweapon'];const kingguard=require(path.join(dir,'sunrise-skill-catalog.json')).skills.sk_royal_kingguard;assert.equal(kingguard.type,'passive');assert.equal(kingguard.cat,'royal');e.cast(c,'sk_royal_precise',time,()=>.5);assert.equal(c.buffs.sk_royal_precise.until,time+16000);e.cast(c,'sk_royal_burnweapon',time+2000,()=>.5);assert.equal(e.stats(c,time+2000).extraDmg,5);assert.equal(r.requiredSkillLevel(c,e.DATA.skills.sk_royal_precise),15);assert.equal(r.requiredSkillLevel(c,e.DATA.skills.sk_lightarrow),Infinity);}
 const catalog=require(path.join(dir,'sunrise-skill-catalog.json'));assert.equal(Object.keys(catalog.skills).length,134);
 const assets=require(path.join(dir,'asset-map.json'));for(const [id,source]of Object.entries(catalog.skills)){const actual=e.DATA.skills[id];for(const [k,v]of Object.entries(source))assert.deepEqual(actual[k],v,id+'.'+k);const icon=assets.icons.skills[source.n];assert.ok(icon,id+' icon');assert.equal(fs.readFileSync(path.join(root,'public',icon)).subarray(0,8).toString('hex'),'89504e470d0a1a0a');}
 {const {c}=fixture('mage');c.skills=[];c.equipment={ring:{id:'relic_mage_scrap_note',en:0}};const access=require(path.join(dir,'skill-access.js'));assert.ok(access.hasSkill(c,'sk_frost_spike'));assert.ok(!c.skills.includes('sk_frost_spike'));e.cast(c,'sk_frost_spike',time,()=>.5);delete c.equipment.ring;assert.ok(!access.hasSkill(c,'sk_frost_spike'));assert.throws(()=>e.cast(c,'sk_frost_spike',time+2000,()=>.5),/尚未學習/);}const armorClass='mage';assert.ok(e.DATA.skills.sk_frost_spike);assert.ok(!r.skillBooks('sk_frost_spike').length,'gear-granted spell is not freely learnable');
 {const legacy={int:40,sp:4,mdmg:2,magicCrit:0},augmented={...legacy,intMagicApplied:1};for(const k of ['sp','mdmg','magicCrit'])augmented[k]+=f.magicIntBonuses(40)[k];assert.deepEqual(f.legacyProcStats(augmented),{...legacy,intMagicApplied:1});}
 console.log('PASS: 134 source definitions, 134 local PNGs, source INT/MR/element/crit/multihit/healing, class restrictions, royal passives/auras, dark critical resources, shock multi-stage failure, retained proc stats.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
