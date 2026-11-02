// Two old rules restored on the Lineage W skills (they stopped working when the old ids were retired):
// 1. 魔法屏障 (lw_skill_160) cannot be recast for 3 seconds after it blocks a spell.
// 2. 衝擊之暈 (lw_skill_400) shows 衝暈失敗 on the target whenever the stun does not land.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'restored-rules-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
try{
 for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
 const R=require(path.join(dir,'lineagew-skill-runtime.js')),CD=require(path.join(dir,'skill-cooldown.js')),P=require(path.join(dir,'combat-presentation.js'));
 const now=1000000;
 function setup(cls,skill,{miss=false,effects}={}){
  const target={uid:'m1',id:'mob',hp:1000,maxHp:1000,...(effects?{effects}:{})};
  const c={id:'c',cls,lv:60,skills:[skill],buffs:{},equipment:{},mp:1000,hp:500,arena:[target],arenaTarget:0,events:[]};
  const events=[];
  const h={definition:()=>({lv:1,mr:0}),weapon:{twohanded:true,w2h:true,wcat:'tohandsword'},shield:undefined,
   physical:()=>({damage:miss?0:20,miss}),magic:()=>0,hit:(t,amount)=>{t.hp-=amount;events.push({kind:'attack',skill,damage:amount});return amount;},
   heal:()=>0,event:(kind,data)=>events.push({kind,...data}),log:()=>{},party:()=>[],teleport:()=>{},consumeArrow:()=>{}};
  return {c,h,events,target};
 }
 // 魔法屏障
 {const {c,h}=setup('mage','lw_skill_160');c.magicBarrierCooldown=now+3000;
  assert.throws(()=>R.castWSkill(c,'lw_skill_160',{},h,now+2999,()=>.5),/冷卻中/,'cannot recast within 3s of breaking');
  assert.ok(CD.skillReadyAt(c,'lw_skill_160')>=now+3000,'the button shows the 3s wait');
  R.castWSkill(c,'lw_skill_160',{},h,now+3000,()=>.5);assert.ok(c.buffs.lw_skill_160?.d.magicBarrier,'recast allowed after 3s');
  const other=setup('mage','lw_skill_10');other.c.magicBarrierCooldown=now+3000;assert.equal(CD.skillReadyAt(other.c,'lw_skill_10'),0,'other spells are not delayed');}
 // 衝擊之暈：失敗（命中但沒暈到）
 {const {c,h,events}=setup('knight','lw_skill_400');R.castWSkill(c,'lw_skill_400',{},h,now,()=>.99);
  assert.equal(events.filter(e=>e.effect==='衝暈失敗').length,1,'failed stun shows 衝暈失敗 once');assert.ok(!c.arena[0].effects?.stun);}
 // 衝擊之暈：成功
 {const {c,h,events}=setup('knight','lw_skill_400');R.castWSkill(c,'lw_skill_400',{},h,now,()=>.01);
  assert.ok(c.arena[0].effects?.stun,'stun lands');assert.equal(events.filter(e=>e.effect==='衝暈失敗').length,0,'no failure text on success');}
 // 衝擊之暈：未命中、已在暈眩中，都算失敗
 {const {c,h,events}=setup('knight','lw_skill_400',{miss:true});R.castWSkill(c,'lw_skill_400',{},h,now,()=>.01);assert.equal(events.filter(e=>e.effect==='衝暈失敗').length,1,'a miss is a failed stun');}
 {const {c,h,events}=setup('knight','lw_skill_400',{effects:{stun:{until:now+5000,value:1}}});R.castWSkill(c,'lw_skill_400',{},h,now,()=>.01);
  assert.equal(events.filter(e=>e.effect==='衝暈失敗').length,1,'an already-stunned target is not stunned again');assert.equal(c.arena[0].effects.stun.until,now+5000,'existing stun is not refreshed');}
 // 畫面：衝暈失敗 文字立即出現一次
 {const fail={seq:5,at:1000,kind:'state',manual:true,skill:'lw_skill_400',miss:true,effect:'衝暈失敗',hp:70,mp:20,slot:0,uid:'mob'};
  const q=P.enqueueSunriseReplay([],[fail],5000,null);let v={hp:100,mp:100,arena:[{uid:'mob',id:'ant',hp:100}],floats:[]};
  for(const time of [5000,5650])for(const e of P.drainCombatPresentation(q.queue,[],time))v=P.applyCombatViewEvent(v,e,time);
  assert.equal(v.floats.filter(f=>f.effect==='衝暈失敗').length,1,'failure text appears once, right away');}
 console.log('PASS restored rules: 魔法屏障 3s lockout after blocking a spell; 衝擊之暈 shows 衝暈失敗 on miss, failed roll or already-stunned target, never on success');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
