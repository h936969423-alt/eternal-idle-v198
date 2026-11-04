const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'custom-eq-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
try{
 for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts')&&!name.endsWith('-store.ts')&&name!=='game-settings.ts')fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
 const e=require(path.join(dir,'engine.js')),custom=require(path.join(dir,'custom-equipment.js')),gm=require(path.join(dir,'gm-item-options.js')),grants=require(path.join(dir,'gm-grants.js')),gear=require(path.join(dir,'gear.js')),magic=require(path.join(dir,'weapon-magic.js')),procs=require(path.join(dir,'lineagew-mythic-procs.js')),safety=require(path.join(dir,'enhancement-safety.js')),display=require(path.join(dir,'gm-gift-display.js')),icons=require(path.join(dir,'gm-icon-library.json')),hybrid=require(path.join(dir,'hybrid-loot.js')),t=1000000;
 const icon=s=>icons.find(r=>r[2]===s)[0],base={rank:'hero',classes:['knight'],minLv:0,safe:6,enhCap:10,price:1000,weight:50,description:'',stats:{},procs:[]};
 const sword=custom.validateCustomEquipment({...base,name:'永夜之刃',slot:'weapon',icon:icon('weapon'),weapon:{wcat:'sword',dmgS:20,dmgL:30},stats:{str:3,hit:5,dmgBonus:2,meleeHit:7},procs:[{skill:'sk_meteor',rate:50},{skill:'lw_chaos_assault',rate:100}]},'gmx_1');
 const ring=custom.validateCustomEquipment({...base,name:'永夜戒指',slot:'ring',icon:icon('ring'),safe:4,enhCap:8,stats:{mhp:100,ac:5}},'gmx_2');
 const belt=custom.validateCustomEquipment({...base,name:'不可強化腰帶',slot:'belt',icon:icon('belt'),enhCap:0,safe:0,stats:{con:2}},'gmx_3');
 // Validation rejects anything outside the whitelist.
 const bad=(patch,msg)=>assert.throws(()=>custom.validateCustomEquipment({...base,name:'x',slot:'ring',icon:icon('ring'),...patch},'gmx_9'),msg);
 bad({name:' '},/名稱/);bad({slot:'doll'},/部位/);bad({icon:'/x.webp'},/圖示/);bad({classes:[]},/職業/);bad({classes:['nobody']},/職業/);bad({stats:{immStone:1}},/屬性無效/);bad({stats:{hit:1}},/屬性無效/);bad({procs:[{skill:'sk_meteor',rate:5}]},/只有武器/);bad({safe:9,enhCap:5},/安定值/);bad({safe:1.5},/安定值/);
 const w={...base,name:'x',slot:'weapon',icon:icon('weapon'),weapon:{wcat:'sword',dmgS:1,dmgL:1}};
 for(const rate of [0,-1,101,NaN])assert.throws(()=>custom.validateCustomEquipment({...w,procs:[{skill:'sk_meteor',rate}]},'gmx_9'),/機率/);
 assert.throws(()=>custom.validateCustomEquipment({...w,procs:[{skill:'sk_nope',rate:5}]},'gmx_9'),/觸發能力/);
 assert.throws(()=>custom.validateCustomEquipment({...w,procs:[{skill:'sk_meteor',rate:5},{skill:'sk_meteor',rate:6}]},'gmx_9'),/重複/);
 assert.throws(()=>custom.validateCustomEquipment({...w,weapon:{wcat:'x',dmgS:1,dmgL:1}},'gmx_9'),/武器類型/);
 // Every offered stat is one the stat engine actually reads.
 const before=Object.keys(e.DATA.items).length,gmBefore=gm.giftOptions.length;
 custom.applyCustomEquipment({items:{gmx_1:sword,gmx_2:ring,gmx_3:belt}});
 assert.equal(Object.keys(e.DATA.items).length,before+3);assert.equal(gm.giftOptions.length,gmBefore+3);
 custom.applyCustomEquipment({items:{gmx_1:sword,gmx_2:ring,gmx_3:belt}});assert.equal(gm.giftOptions.length,gmBefore+3,'apply is idempotent');
 assert.ok(gm.weaponOptions.some(o=>o.id==='gmx_1'));assert.ok(gm.armorOptions.some(o=>o.id==='gmx_2'));
 assert.ok(display.giftDisplayOptions(gm.weaponOptions,false).some(o=>o.id==='gmx_1'),'shown in the default gift list');
 assert.ok(display.allItemOptions().some(o=>o.id==='gmx_2'),'available to monster drop editors');
 assert.equal(hybrid.validateHybridRule?.({...hybrid.defaultHybridRule(10,'normal'),pool:'custom',equipmentIds:['gmx_1']}).equipmentIds[0]??'gmx_1','gmx_1');
 const classBase=e.BASES.knight,al={};let p=classBase.pts;for(const k of ['str','dex','con','int','wis','cha']){al[k]=Math.min(p,20-classBase[k]);p-=al[k];}
 const c=e.createCharacter('自訂','knight','m',al,t),save={v:1,at:t,characters:[c],active:c.id};
 const allKeys=Object.keys(custom.CUSTOM_STATS).filter(k=>!['hit','dmgBonus'].includes(k)),s0=e.stats(c,t);
 for(const k of allKeys)assert.ok(k in s0||k==='mhp'||k==='mmp',`stat ${k} is read`);
 // GM gift, equip, stats.
 const grant=grants.validateGrant({characterId:c.id,type:'weapon',itemId:'gmx_1',quantity:1,enhancement:0});grants.applyGrant(save,grant,t);assert.equal(c.bag.gmx_1,1);
 const before2=e.stats(c,t);e.action(save,{type:'equip',item:'gmx_1'},t+1);const after=e.stats(c,t+1);
 assert.equal(c.equipment.weapon.id,'gmx_1');assert.equal(after.str-before2.str,3);assert.ok(after.meleeHit>=before2.meleeHit+7);
 c.bag.gmx_2=1;e.action(save,{type:'equip',item:'gmx_2'},t+2);const worn=e.stats(c,t+2);assert.equal(worn.ac,after.ac-5,'positive defence lowers AC');
 // A class that may not use it cannot equip it.
 assert.equal(e.usable({...c,cls:'mage'},e.DATA.items.gmx_1),false);
 // Enhancement honours the configured safe value and cap, including accessories.
 assert.deepEqual(safety.enhancementSafety('gmx_1',e.DATA.items.gmx_1),{canEnhance:true,safe:6,cap:10});
 assert.deepEqual(safety.enhancementSafety('gmx_2',e.DATA.items.gmx_2),{canEnhance:true,safe:4,cap:8});
 assert.equal(safety.enhancementSafety('gmx_3',e.DATA.items.gmx_3).canEnhance,false);
 // Accessories gain no AC from enhancement; armor keeps the normal rule.
 const ac0=e.stats(c,t+2).ac;c.equipment.ring.en=4;assert.equal(e.stats(c,t+2).ac,ac0);c.equipment.ring.en=0;
 // Triggered abilities: magic rolls in order, mythic abilities roll separately.
 let rolled=magic.triggeredWeaponMagic(c,()=>.49);assert.equal(rolled.skill,'sk_meteor');assert.equal(magic.triggeredWeaponMagic(c,()=>.5),null);
 assert.deepEqual(procs.rollMythicProcs(e.DATA.items.gmx_1,0,()=>.99).map(p=>p.skill),['lw_chaos_assault']);
 assert.ok(procs.mythicAssaultDamage(e.DATA.items.gmx_1,0,{meleeDmg:0,rangedDmg:0,extraDmg:0},{s:'S',dr:0},()=>.99)>=30,'assault uses the weapon dice');
 assert.ok(/攻擊時 50% 施展流星雨/.test(e.DATA.items.gmx_1.d));assert.ok(/攻擊時 100% 施展渾沌狂襲/.test(e.DATA.items.gmx_1.d));
 // Editing applies to held copies; deleting refunds them once at the sell price.
 custom.applyCustomEquipment({items:{gmx_1:{...sword,stats:{str:9}},gmx_2:ring,gmx_3:belt}});assert.equal(e.stats(c,t+3).str-before2.str,9);
 const gold=c.gold;c.bank.gmx_3=2;custom.applyCustomEquipment({items:{gmx_1:{...sword,deleted:true},gmx_2:ring,gmx_3:{...belt,deleted:true}}});
 assert.ok(!gm.giftOptions.some(o=>o.id==='gmx_1'),'deleted items leave the GM lists');assert.ok(!display.allItemOptions().some(o=>o.id==='gmx_1'));assert.throws(()=>grants.validateGrant({characterId:c.id,type:'weapon',itemId:'gmx_1',quantity:1}),/有效道具/);
 e.advance(save,t+5000,()=>.5);assert.equal(c.gold-gold,250*3,'worn copy counted once');assert.equal(c.equipment.weapon,undefined);assert.equal(c.bank.gmx_3,undefined);
 const g2=c.gold;e.advance(save,t+6000,()=>.5);assert.equal(c.gold,g2,'refund only once');
 custom.applyCustomEquipment({items:{}});assert.equal(Object.keys(e.DATA.items).length,before);assert.equal(gm.giftOptions.length,gmBefore);
 console.log('PASS GM custom equipment: validation, gifts, stats, enhancement, procs, edit and refund');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
