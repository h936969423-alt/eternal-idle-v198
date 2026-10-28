const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync('/tmp/weapon-growth-');
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
for(const name of fs.readdirSync(path.join(root,'lib/game'))){
 const f=path.join(root,'lib/game',name);
 if(name.endsWith('.json'))fs.copyFileSync(f,path.join(dir,name));
 else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);
}
try{
 const e=require(path.join(dir,'engine')),g=require(path.join(dir,'gear')),p=require(path.join(dir,'weapon-enhancement')),a=require(path.join(dir,'attack-rules')),w=require(path.join(dir,'lineagew-mythic')),r=require(path.join(dir,'enhancement-rules'));
 const expected=[[0,0],[1,1],[2,2],[3,3],[4,4],[5,5],[6,6],[8,8],[10,10],[12,12],[16,14],[21,16],[26,18],[31,20],[36,22],[42,25],[50,28],[59,31],[69,34],[80,37],[92,40],[105,43],[119,46]];
 expected.forEach(([damage,hit],en)=>assert.deepEqual(p.weaponGrowth(en),{damage,hit}));
 assert.deepEqual(p.weaponGrowth(30),{damage:267,hit:70});
 const all=Object.entries(e.DATA.items),eligible=all.filter(([id,i])=>p.hasUnlimitedWeaponGrowth(id,i)),ranks=new Set(eligible.map(([,i])=>i.lwGrade).filter(Boolean));
 for(const rank of ['rare','hero','legend','mythic'])assert(ranks.has(rank),rank);
 const fixture=(id,en=0)=>{const base=e.BASES.knight,allocation={};let left=base.pts;for(const k of ['str','dex','con','int','wis','cha']){allocation[k]=Math.min(left,20-base[k]);left-=allocation[k];}
 const c=e.createCharacter('強化驗證','knight','m',allocation,1000000);c.bag={[id]:1,scroll_weapon:30,scroll_weapon_b:30};c.enh={[id]:en};c.equipment={weapon:{id,en}};return c;};
 for(const [id,i] of eligible){
  for(const en of [0,6,7,10,15,16,20,30]){
   const c=fixture(id,en),b=e.stats(c,1000000),profile=w.lineageWProfile(i,en),common=p.weaponGrowth(en);
   assert.equal(b.weaponDamageBonus,(profile?.damage??i.dmgBonus??0)+common.damage,id+' +'+en);
   assert.equal(g.enhancementInfo(c,id).cap,Infinity);
  }
 }
 const id=eligible.find(([,i])=>i.source==='lineagew'&&i.lwGrade==='rare')[0],i=e.DATA.items[id];
 for(const en of [7,12,15,20,30]){
  const c=fixture(id,en);g.enhanceGear(c,id,'normal',()=>0);assert.equal(c.enh[c.lastGear.key],en+1);assert.equal(c.equipment.weapon.en,en+1);assert.equal(c.bag.scroll_weapon,29);
 }
 // Drive the actual damage/hit calculation with and without only the common bonus.
 for(const en of [1,7,10,15,20]){
  const c=fixture(id,en),b=e.stats(c,1000000),common=p.weaponGrowth(en),profile=w.lineageWProfile(i,en),without={...b,meleeDmg:b.meleeDmg-common.damage,meleeHit:b.meleeHit-common.hit,rangedDmg:b.rangedDmg-common.damage,rangedHit:b.rangedHit-common.hit};
  const target={lv:1,ac:0,s:'S',hp:1000000,dr:0},withStrike=a.playerStrike(c,b,target,()=>.5,undefined,1000000,{forceHit:true,forceHeavy:true}),baseStrike=a.playerStrike(c,without,target,()=>.5,undefined,1000000,{forceHit:true,forceHeavy:true});
  assert.equal(withStrike.damage-baseStrike.damage,common.damage);
 }
 const low=all.find(([,i])=>i.source==='lineagew'&&i.type==='wpn'&&i.lwGrade==='advanced'&&!i.noEnh);
 assert(!p.hasUnlimitedWeaponGrowth(low[0],low[1]));assert.equal(g.enhancementInfo(fixture(low[0],6),low[0]).cap,12);
 for(const [id,i] of all.filter(([,i])=>i.type==='arm'||i.type==='acc'))assert(!p.hasUnlimitedWeaponGrowth(id,i));
 for(const en of [12,15,20,50,100])for(const blessed of [false,true]){
  const rate=r.enhancementRates('wpn',en,6,blessed,false);assert(rate.success>0&&rate.success<=1);assert(Math.abs(rate.success+rate.hold+rate.destroy-1)<1e-12);
 }
 const refined=fixture(id,20);refined.bag.scroll_weapon_s=1;g.enhanceGear(refined,id,'refined',()=>.999);assert.equal(refined.enh[refined.lastGear.key],21);
 const failed=fixture(id,20);g.enhanceGear(failed,id,'normal',()=>.999);assert(!failed.bag[failed.lastGear.key]);assert.equal(failed.equipment.weapon,undefined);
 console.log('PASS: '+eligible.length+' blue-to-gold weapons, exact +0..+22 and +30 table, real stats and damage, uncapped upgrades, finite high-level rates, refined/destruction, white/green and armor exclusion');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
