const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'retarget-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
try{
 for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
 const e=require(path.join(dir,'engine.js')),t=1000000;
 const normal=x=>x.kind==='attack'&&!x.skill&&!x.weaponProc&&(!x.source||x.source==='physical')&&x.mobHp!==undefined;
 function run(lv,ms,fast=false){const base=e.BASES.knight,allocation={};let points=base.pts;for(const k of ['str','dex','con','int','wis','cha']){allocation[k]=Math.min(points,20-base[k]);points-=allocation[k];}
  const c=e.createCharacter('測試','knight','m',allocation,t);c.lv=lv;c.attrs.con=10000;c.hp=e.stats(c,t).maxHp;c.autoPotion=false;c.zone='training';if(fast){for(const id of ['potion_haste','potion_brave','sk_elf_wind_walk','sk_holy_dash'])c.buffs[id]={until:t+10e6,d:{}};c.buffs.fastTest={until:t+10e6,d:{atkSpdPct:300}};}e.ensureArena(c,()=>.5,t);c.running=true;
  const s={v:1,at:t,characters:[c],active:c.id},seen=new Map();
  for(let i=0;i<ms/1000;i++){e.advance(s,s.at+1000,()=>.5);for(const x of c.events||[])seen.set(x.seq,x);}
  return {c,hits:[...seen.values()].filter(normal).sort((a,b)=>a.at-b.at||a.seq-b.seq),interval:e.stats(c,t).attackInterval*1000};}
 for(const [lv,fast] of [[1,false],[99,false],[99,true],[30,true]]){
  const {hits,interval}=run(lv,60000,fast),kills=hits.filter(h=>h.mobHp<=0);
  assert.ok(kills.length>=2,`lv${lv}: needs kills to test`);
  for(const k of kills){const next=hits.find(h=>h.seq>k.seq);if(next)assert.ok(next.at-k.at>=e.RETARGET_DELAY_MS,`lv${lv}: next attack ${next.at-k.at}ms after a kill`);}
  // Never two normal attacks closer than one attack interval (no double arrow).
  for(let i=1;i<hits.length;i++)assert.ok(hits[i].at-hits[i-1].at>=interval-1,`lv${lv}: attacks ${hits[i].at-hits[i-1].at}ms apart (interval ${interval})`);
  // Rhythm restarts at the end of the pause; the wait is not stretched to a full extra interval.
  const gaps=kills.map(k=>hits.find(h=>h.seq>k.seq)).filter(Boolean).map((n,i)=>n.at-kills[i].at);
  assert.ok(Math.min(...gaps)<=Math.max(e.RETARGET_DELAY_MS,interval)+1000,`lv${lv}: pause too long ${Math.min(...gaps)}`);
  console.log(`lv${lv}${fast?' fast':''}: interval ${interval}ms, ${kills.length} kills, gap after kill ${Math.min(...gaps)}–${Math.max(...gaps)}ms`);
 }
 console.log('PASS retarget delay: 0.5s pause after each kill, no double attacks, rhythm restarts');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
