const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),vm=require('node:vm'),cp=require('node:child_process'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync('/tmp/lineagew-mythic-'),opts={module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX};fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
for(const name of fs.readdirSync(path.join(root,'lib/game'))){const file=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(file,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:opts}).outputText);}
try{
 const e=require(path.join(dir,'engine')),a=require(path.join(dir,'attack-rules')),p=require(path.join(dir,'lineagew-mythic')),g=require(path.join(dir,'gear')),gm=require(path.join(dir,'gm-grants')),appearance=require(path.join(dir,'loot-appearance')),tables=require(path.join(dir,'attack-tables'));
 const sword='lw_weapon_919276',bow='lw_weapon_919284',ids=[sword,bow];
 const baseline=JSON.parse(cp.execFileSync('git',['show','7964a7ac4edc0089bfb2c2254ee5ac37ff64eb30:lib/game/gamedata.json'],{cwd:root,maxBuffer:20e6}));
 assert.deepEqual(Object.keys(e.DATA.items).filter(id=>!Object.hasOwn(baseline.items,id)&&!id.startsWith('lw_equipment_')),[...ids,'lw_weapon_919283','lw_weapon_919278']);
 for(const [id,item]of Object.entries(baseline.items))assert.deepEqual(e.DATA.items[id]||require(path.join(dir,'lineagew-retired.json')).items[id]||require(path.join(dir,'lineagew-hl-retired.json')).items[id]||require(path.join(dir,'lineagew-mythic-retired.json')).items[id],item.lwMythicId?{...item,noEnh:false,enhCap:7,d:item.d.replace('玩家衝裝尚未開放。','玩家強化採永夜規則，上限 +7。')}:item,'unchanged existing item '+id);
 const make=(cls='knight')=>{const base=e.BASES[cls],allocation={};let points=base.pts;for(const key of ['str','dex','con','int','wis','cha']){allocation[key]=Math.min(points,20-base[key]);points-=allocation[key];}return e.createCharacter('神話測試',cls,'m',allocation,1000);};
 for(const id of ids){
  const i=e.DATA.items[id];assert.equal(appearance.itemRarity(id+'@copy'),'mythic');assert.equal(appearance.itemFrameColor(id),'#ffd700');assert.equal(i.noEnh,false);assert.equal(i.enhCap,7);assert.equal(i.noSell,true);assert.equal(i.noWh,true);assert.ok(fs.statSync(path.join(root,'public',i.sourceIcon)).size>1000);
  assert.equal(p.lineageWProfile(i,99).stage,7);assert.equal(p.lineageWProfile(i,Infinity).stage,0);
  assert.ok(!JSON.stringify(baseline.maps).includes(id));assert.ok(!JSON.stringify(baseline.worldBosses).includes(id));
  const c=make(i.req),save={...e.emptySave(1000),characters:[c],active:c.id};
  gm.applyGrant(save,gm.validateGrant({characterId:c.id,type:'weapon',itemId:id,quantity:1,enhancement:0}),1000);assert.equal(c.bag[id],1);
  e.action(save,{type:'equip',item:id},1000);assert.equal(c.equipment.weapon.id,id);assert.equal(g.enhancementInfo(c,id).cap,Infinity);
  const zero=e.stats(c,1000);
  c.enh[id]=7;c.equipment.weapon.en=7;const seven=e.stats(c,1000),profile=p.lineageWProfile(i,7),base=p.lineageWProfile(i,0);
  if(id===sword){assert.equal(seven.str-zero.str,6);assert.equal(seven.meleeHit-zero.meleeHit,36+tables.getStrMeleeHit(seven.str)-tables.getStrMeleeHit(zero.str));assert.equal(seven.meleeDmg-zero.meleeDmg,48+tables.getStrMeleeDmg(seven.str)-tables.getStrMeleeDmg(zero.str));}
  else{assert.equal(seven.dex-zero.dex,6);assert.equal(seven.rangedHit-zero.rangedHit,43+tables.getDexRangedHit(seven.dex)-tables.getDexRangedHit(zero.dex));assert.equal(seven.rangedDmg-zero.rangedDmg,38+tables.getDexRangedDmg(seven.dex)-tables.getDexRangedDmg(zero.dex));}
  for(let en=0;en<=7;en++){c.equipment.weapon.en=en;const values=e.stats(c,1000);for(const n of Object.values(values))assert.ok(Number.isFinite(n));const q=p.lineageWProfile(i,en);assert.ok(q.maxS>=q.minS);assert.ok(q.maxL>=q.minL);}
  // GM can still set any safe integer; known table stops at +7 rather than inventing values.
  const grant=gm.validateGrant({characterId:c.id,type:'weapon',itemId:id,quantity:1,enhancement:99});gm.applyGrant(save,grant,1000);const copy=Object.keys(c.bag).find(k=>k.startsWith(id+'@'));assert.ok(copy);assert.equal(c.enh[copy],99);
  assert.equal(e.usable(make(id===sword?'elf':'knight'),i),false);
 }
 // Real strike path: sizes, min/max growth, flat DR bypass, undead dice and bow penetration.
 const c=make();c.cls='royal';c.equipment={weapon:{id:sword,en:0}};
 const b={...e.stats(c,1000),meleeDmg:0,rangedDmg:0,extraDmg:0,meleeCrit:0,rangedCrit:0,damagePct:0,doubleChance:0,maxWeapon:0};
 const foe={s:'S',lv:1,ac:10,dr:0,hardSkin:0},hit={forceHit:true,forceHeavy:true};
 assert.equal(a.playerStrike(c,b,foe,()=>.5,undefined,1000,hit).damage,71);
 assert.equal(a.playerStrike(c,b,{...foe,s:'L'},()=>.5,undefined,1000,hit).damage,80);
 assert.equal(a.playerStrike(c,b,{...foe,dr:30},()=>.5,undefined,1000,hit).damage,51);
 assert.equal(a.playerStrike(c,b,{...foe,un:true},()=>.5,undefined,1000,hit).damage,71+38);
 c.equipment.weapon.en=7;assert.equal(a.playerStrike(c,b,foe,()=>.5,undefined,1000,hit).damage,101);
 assert.equal(a.playerStrike(c,b,foe,()=>0,undefined,1000,{forceHit:true}).damage,21);
 assert.equal(a.playerStrike(c,b,{...foe,un:true},()=>.5,undefined,1000,hit).damage,101+38+11);
 c.equipment.weapon={id:bow,en:0};assert.equal(a.playerStrike(c,b,{...foe,hardSkin:50},()=>.5,{dmgS:6},1000,hit).damage,71);
 // Triple-arrow path passes an arrow die override; the W weapon still contributes its weapon damage.
 assert.equal(a.playerStrike(c,b,foe,()=>.5,undefined,1000,{...hit,skill:true,dice:6}).damage,71);
 // Render actual components: source icons, gold plate, stage totals, visible pending effects.
 const cache={};function app(name){if(cache[name])return cache[name];const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'app',name+'.tsx'),'utf8'),{compilerOptions:opts}).outputText,{module:mod,exports:mod.exports,require:key=>key.startsWith('./')?app(key.slice(2)):key.startsWith('@/lib/game/')?require(path.join(dir,key.slice('@/lib/game/'.length))):require(key),Object,JSON,Date});return cache[name]=mod.exports;}
 for(const id of ids){const i=e.DATA.items[id],html=renderToStaticMarkup(React.createElement('div',null,React.createElement(app('item-icon').default,{itemId:id,src:i.sourceIcon,alt:i.n}),React.createElement(app('lineagew-mythic-details').default,{item:i,en:7})));assert.ok(html.includes(i.sourceIcon));assert.match(html,/outline:2px solid #ffd700/);assert.ok(!html.includes('<select'));assert.ok(!html.includes('試作'));assert.ok(html.includes('武器命中'));assert.ok(html.includes('equipment-ability-list'));}
 console.log('PASS: 2 original icons; all existing items unchanged; GM grant/equip/class restrictions; mythic gold; +0–7 stats without double enchant bonuses; actual small/large, min/max, DR, undead, bow/arrow combat; visible pending skills; unrestricted GM values with explicit +7 table boundary.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
