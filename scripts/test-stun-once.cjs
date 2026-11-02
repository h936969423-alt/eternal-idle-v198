// 衝擊之暈 (original rules again since legacy-skills-v2): one physical strike shown once; the control
// graphic appears only on a landed stun (狀態命中) and 衝暈失敗 appears once when it fails.
const fs=require('fs'),path=require('path'),os=require('os'),assert=require('node:assert/strict'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'stun-once-')),at=1000000;let checks=0;
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
try{
 fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),compile(fs.readFileSync(from,'utf8')));}
 const e=require(path.join(dir,'engine.js')),P=require(path.join(dir,'combat-presentation.js')),cues=require(path.join(dir,'animation-cues.js')),feedback=require(path.join(dir,'cast-feedback.js')),raw=require(path.join(dir,'gamedata.json'));
 function fixture(input,rng){
  const allocation={};let left=e.BASES.knight.pts;for(const k of ['str','dex','con','int','wis','cha']){allocation[k]=Math.min(left,20-e.BASES.knight[k]);left-=allocation[k];}const c=e.createCharacter('衝暈驗證','knight','m',allocation,at);c.lv=99;c.lawful=32767;c.skills=['sk_shock_stun'];c.zone='training';c.mp=100000;c.running=false;
  const weapon=Object.entries(raw.items).find(([,w])=>w.type==='wpn'&&!w.isBow&&!w.isArrow&&(!raw.skills.sk_shock_stun.reqWpn||raw.skills.sk_shock_stun.reqWpn!=='w2h'||w.twohanded||w.w2h||w.wcat==='tohandsword'));c.equipment.weapon={id:weapon[0],en:0};e.ensureArena(c,()=>.5,at);c.arena.forEach(t=>{t.hp=t.maxHp=1000000;delete t.effects;});
  const after=c.eventSeq||0,save={v:1,at,active:c.id,characters:[c]};e.action(save,{type:'cast',skill:input},at,rng);return {c,fresh:c.events.filter(x=>x.seq>after)};
 }
 const check=(name,fn)=>{fn();checks++;console.log('PASS',name);};
 const view=events=>{let v={hp:100,mp:100000,arena:[{uid:events.find(x=>x.uid)?.uid,id:'x',hp:1000000,maxHp:1000000}],floats:[],casts:[]};for(const x of events)v=P.applyCombatViewEvent(v,{...x,slot:0},2000);return v;};
 const land=()=>.05,fail=()=>.5;
 check('新版編號與舊編號施放同一個舊版衝擊之暈',()=>{const a=fixture('sk_shock_stun',land).fresh,b=fixture('lw_skill_400',land).fresh;assert(a.length&&a.every(x=>!x.skill||x.skill==='sk_shock_stun'));assert.deepEqual(b.map(x=>[x.kind,x.skill,x.effect]),a.map(x=>[x.kind,x.skill,x.effect]));});
 check('暈到：武器一擊不出控制特效，狀態命中出一次',()=>{const {fresh,c}=fixture('sk_shock_stun',land);assert(c.arena.some(t=>t.effects?.stun),'stun landed');const hits=fresh.filter(x=>x.kind==='attack');assert.equal(hits.length,1,'one strike');const v=view(fresh);assert.equal(v.casts.filter(x=>x.skill==='sk_shock_stun').length,1,'one control graphic');assert(v.casts.every(x=>x.effect==='狀態命中'));assert(!fresh.some(x=>x.effect==='衝暈失敗'));});
 check('沒暈到：衝暈失敗出現一次，沒有控制特效',()=>{const {fresh,c}=fixture('sk_shock_stun',fail);assert(!c.arena.some(t=>t.effects?.stun));const v=view(fresh);assert.equal(v.floats.filter(f=>f.effect==='衝暈失敗').length,1);assert.equal(v.casts.filter(x=>x.skill==='sk_shock_stun').length,0);});
 check('冷卻 6 秒（舊版）',()=>{const {c}=fixture('sk_shock_stun',fail);assert.equal(c.skillCooldowns.sk_shock_stun,at+6000);assert.throws(()=>e.cast(c,'sk_shock_stun',at+5999,()=>.5),/冷卻/);});
 check('按下時播攻擊動作（物理技能）',()=>{assert.equal(cues.playerActionKind('sk_shock_stun'),'attack');const pose=feedback.castFeedbackPose({id:1,characterId:'c',skill:'sk_shock_stun',at:0,afterSeq:0},'c',10,6,1000);assert.equal(pose?.kind,'attack');});
 console.log(`PASS ${checks} original shock-stun checks`);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
