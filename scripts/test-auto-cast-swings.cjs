// Frequent automatic casts (auto heal + MP conversion) must not starve the player's swing.
// Each auto cast used to restart the cast pose, the waiting swing never started, no swing reached
// contact, and no normal hit, kill or loot was displayed (the monster just stood there).
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'auto-cast-swings-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
try{
 for(const name of ['sunrise-player-motion.ts','local-hit-sync.ts','animation-clock.ts'])if(fs.existsSync(path.join(root,'lib/game',name)))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(path.join(root,'lib/game',name),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);
 const M=require(path.join(dir,'sunrise-player-motion.js')),L=require(path.join(dir,'local-hit-sync.js'));
 const timing={counts:{attack:6,skill:6,idle:1},attackSeconds:.9,castSeconds:1.2},contactAt=L.localContactFrame(6,.9);
 function run(castPose,castEvery){
  let st=M.emptySunriseClock(),clock={elapsed:0,period:timing.attackSeconds},contacts=0,lastContact=null;
  for(let now=0;now<=20000;now+=10){
   if(now%M.SUNRISE_ATTACK_TICK_MS===0){const next=M.tickLocalPlayerAttack(clock,timing.attackSeconds,true);clock=next.clock;if(next.attack)st=M.triggerSunriseMotion(st,'attack',now,timing);}
   if(castEvery&&now>0&&now%castEvery===0)st=castPose(st,now);
   st=M.advanceSunriseMotion(st,now,timing);
   const pose=M.sunriseMotionPose(st,now,timing);
   if(pose.kind==='attack'&&pose.frame>=contactAt&&lastContact!==st.t){lastContact=st.t;contacts++;}
  }
  return contacts;
 }
 const old=(st,now)=>M.triggerSunriseMotion(st,'skill',now,timing),fixed=(st,now)=>M.autoCastYieldsToSwing(st,now,timing)?st:M.triggerSunriseMotion(st,'skill',now,timing);
 const idle=run(fixed,0),oldBusy=run(old,800),newBusy=run(fixed,800),newVeryBusy=run(fixed,400);
 assert.ok(oldBusy<=1,`reproduces starvation with the old rule (${oldBusy} swings in 20s)`);
 assert.ok(newBusy===idle,`auto casts every 0.8s keep every swing (${newBusy}/${idle})`);
 assert.ok(newVeryBusy>=idle-1,`even every 0.4s at most one swing is lost (the cast before the first swing) (${newVeryBusy}/${idle})`);
 // Automatic casts still show their pose when no swing is in progress or waiting.
 assert.equal(M.autoCastYieldsToSwing(M.emptySunriseClock(),1000,timing),false,'no swing: the cast pose plays at once');
 // A manual click (triggerSunriseMotion) still interrupts a swing immediately.
 const swinging=M.triggerSunriseMotion(M.emptySunriseClock(),'attack',0,timing);
 assert.equal(M.triggerSunriseMotion(swinging,'skill',100,timing).act,'skill');
 assert.equal(M.autoCastYieldsToSwing(swinging,100,timing),true,'an automatic cast does not cut a swing short');
 assert.equal(M.autoCastYieldsToSwing({...M.emptySunriseClock(),act:'skill',t:0,pendAtk:true},100,timing),true,'nor jump ahead of a waiting swing');
 console.log(`PASS auto casts no longer starve swings: 20s idle ${idle} swings; casts every 0.8s old ${oldBusy} → now ${newBusy}; every 0.4s now ${newVeryBusy}`);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
