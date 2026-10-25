const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'gm-gift-check-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
// The production catalog intentionally retired the old weapon. Exercise
// generic GM weapon affixes with a clearly isolated immutable test definition.
const archivedWeapon={...require('../lib/game/lineagew-retired.json').items,...require('../lib/game/lineagew-hl-retired.json').items,...require('../lib/game/lineagew-mythic-retired.json').items}.ap381_weapon_24;
assert.ok(archivedWeapon);require('./item-fixtures.cjs')(dir,{qa_gm_weapon:{...archivedWeapon}});
const e=require(path.join(dir,'engine.js')),gm=require(path.join(dir,'gm-grants.js')),opts=require(path.join(dir,'gm-item-options.js')),rules=require(path.join(dir,'affix-rules.js')),gear=require(path.join(dir,'gear.js')),sync=require(path.join(dir,'state-sync.js')),gift=require(path.join(dir,'gm-gift-affixes.js'));
try{
 const imported=Object.entries(e.DATA.items).filter(([id,i])=>!id.startsWith('qa_')&&i.source==='apang381'&&['wpn','arm','acc'].includes(i.type)).map(([,i])=>i);assert.equal(imported.length,459);for(const item of imported)assert.equal(gift.giftAffixEligible(item),!rules.isPetEquipment(item)&&!item.noEquip&&!item.isArrow&&!item.doll&&!item.wearHours,item.n+' current GM eligibility');for(const item of [{type:'wpn',isArrow:true},{type:'arm',petEquip:true},{type:'acc',doll:true},{type:'arm',noEquip:true},{type:'wpn',noAffix:true},{type:'arm',source:'apang381',petOnly:true},{type:'acc',source:'apang381',wearHours:1}])assert.equal(gift.giftAffixEligible(item),false);
 const now=1000000,b=e.BASES.knight,allocation={};let left=b.pts;for(const key of ['str','dex','con','int','wis','cha']){allocation[key]=Math.min(left,20-b[key]);left-=allocation[key];}
 const save=e.emptySave(now),c=e.createCharacter('贈送測試','knight','m',allocation,now);save.characters=[c];save.active=c.id;
 const base={characterId:c.id,type:'weapon',itemId:'qa_gm_weapon',quantity:2,enhancement:1000000},affixes={blessing:'blessed',ancient:'eternal',element:{element:'fire',tier:5}};
 for(const option of [...opts.weaponOptions,...opts.armorOptions]){assert.equal(option.cap,null);}
 for(const n of [0,12,13,99,100,101,999,1000,1001,10000,1000000,Number.MAX_SAFE_INTEGER])assert.equal(gm.validateGrant({...base,enhancement:n}).enhancement,n);
 for(const n of [-1,1.5,'1000',NaN,Infinity,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>gm.validateGrant({...base,enhancement:n}),/強化值/);
 const noEnh=opts.equipmentOptions.find(i=>e.DATA.items[i.id].noEnh);assert.ok(noEnh);assert.equal(gm.validateGrant({...base,type:'equipment',itemId:noEnh.id,enhancement:10000}).enhancement,10000);gm.applyGrant(save,gm.validateGrant({...base,type:'equipment',itemId:noEnh.id,quantity:1,enhancement:10000}),now);const gmOverrideKey=Object.keys(c.bag).find(k=>k.startsWith(noEnh.id+'@'));assert.equal(c.enh[gmOverrideKey],10000);assert.throws(()=>gear.enhancementInfo(c,gmOverrideKey),/不能強化/);
 for(const a of [null,[],{blessing:'fake'},{ancient:'fake'},{element:{element:'fire',tier:6}},{element:{element:'fire',tier:1.5}},{element:{element:'fake',tier:1}},{key:'mhp',value:999999}])assert.throws(()=>gm.validateGrant({...base,affixes:a}),/詞條|元素/);
 assert.throws(()=>gm.validateGrant({...base,type:'item',itemId:opts.itemOptions[0].id,enhancement:0,affixes}),/詞條/);
 const grant=gm.validateGrant({...base,affixes});gm.applyGrant(save,grant,now);const keys=Object.keys(c.bag).filter(k=>k.startsWith(base.itemId+'@'));assert.equal(keys.length,2);
 for(const key of keys){assert.equal(c.bag[key],1);assert.equal(c.enh[key],1000000);assert.deepEqual(c.affixes[key],{key:'families',name:'',value:0,...affixes});assert.equal(rules.affixGlow(c,key),'gear-glow-tri');}
 c.affixes[keys[0]].element.tier=1;assert.equal(c.affixes[keys[1]].element.tier,5,'copies must not share affix state');assert.equal(grant.affixes.element.tier,5);
 e.action(save,{type:'equip',item:keys[1]},now);const withAffixes=e.stats(c,now),stored=c.affixes[keys[1]];delete c.affixes[keys[1]];const without=e.stats(c,now);c.affixes[keys[1]]=stored;
 assert.equal(c.equipment.weapon.en,1000000);assert.equal(withAffixes.extraDmg-without.extraDmg,14);assert.equal(withAffixes.extraHit-without.extraHit,1);assert.equal(withAffixes.sp-without.sp,11);
 const restored=JSON.parse(JSON.stringify(sync.persistedSave(save)));assert.equal(restored.characters[0].enh[keys[1]],1000000);assert.deepEqual(restored.characters[0].affixes[keys[1]],stored);
 const plainCount=c.bag[base.itemId]||0;gm.applyGrant(save,gm.validateGrant({...base,quantity:1,enhancement:0}),now);assert.equal(c.bag[base.itemId],plainCount+1);
 const before=new Set(Object.keys(c.bag));gm.applyGrant(save,gm.validateGrant({...base,quantity:2,enhancement:0,affixes:{ancient:'ancient'}}),now);const zero=Object.keys(c.bag).filter(k=>!before.has(k));assert.equal(zero.length,2);assert.ok(zero.every(k=>c.affixes[k].ancient==='ancient'&&!c.enh[k]));
 for(const id of ['arm','acc'].map(type=>opts.equipmentOptions.find(o=>e.DATA.items[o.id].source==='apang381'&&e.DATA.items[o.id].type===type&&gift.giftAffixEligible(e.DATA.items[o.id])).id)){gm.applyGrant(save,gm.validateGrant({...base,type:'equipment',itemId:id,quantity:1,affixes}),now);const key=Object.keys(c.bag).find(k=>k.startsWith(id+'@'));assert.equal(c.enh[key],1000000);assert.equal(rules.affixGlow(c,key),'gear-glow-tri');}
 const potion=opts.itemOptions.find(i=>i.category==='potion');assert.equal(gm.validateGrant({...base,type:'item',itemId:potion.id,enhancement:0,quantity:10000}).quantity,10000);
 assert.equal(gear.enhancementInfo(c,keys[1]).chance,0,'GM enhancement does not turn ordinary source scrolls into guaranteed success');
 console.log('PASS: current catalog eligibility plus isolated archived weapon mechanics; forbidden non-gear/pets/arrows stay excluded; uncapped GM values above +1000 through safe-integer validation; +1000000 grants and persistence; canonical three-family validation; unique copies; +0 affix isolation; weapon/armor/accessory grants; actual equipped bonuses; save persistence; normal enhancement and 10000-item limits.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}

