const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'world-walk-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
try{
 for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText.replace(/from '\.\/([^']+)\.ts'/g,"from './$1'"));}
 const e=require(path.join(dir,'engine.js')),t=1000000;
 function run(zone,lv=40){const base=e.BASES.knight,allocation={};let points=base.pts;for(const k of ['str','dex','con','int','wis','cha']){allocation[k]=Math.min(points,20-base[k]);points-=allocation[k];}
  const c=e.createCharacter('測試','knight','m',allocation,t);c.lv=lv;c.attrs.con=10000;c.hp=e.stats(c,t).maxHp;c.autoPotion=false;c.zone=zone;e.ensureArena(c,()=>.5,t);c.running=true;
  const s={v:1,at:t,characters:[c],active:c.id},seen=new Map();
  for(let i=0;i<120;i++){e.advance(s,s.at+1000,()=>.5);for(const x of c.events||[])seen.set(x.seq,x);}
  return [...seen.values()].sort((a,b)=>a.seq-b.seq);}
 const kills=ev=>ev.filter(x=>x.kind==='attack'&&x.mobHp===0);
 assert.equal(e.retargetDelayMs('talking_island'),2000);assert.equal(e.retargetDelayMs('training'),e.RETARGET_DELAY_MS);
 const ev=run('talking_island'),done=kills(ev);assert.ok(done.length>=2,'needs kills');
 let lastTarget;
 for(const k of done){for(const x of ev){if(x.seq<=k.seq||x.at>=k.at+2000)continue;
  assert.ok(!(x.kind==='attack'&&(!x.source||x.source==='physical')&&x.mobHp>=0),`player hit ${x.at-k.at}ms into the walk`);
  assert.ok(!(x.kind==='hurt'&&x.uid),`monster hit ${x.at-k.at}ms into the walk`);}}
 // A monster may only hit the player while it is the one being fought.
 for(const x of ev){if(x.kind==='attack'&&x.uid)lastTarget=x.uid;if(x.kind==='hurt'&&x.uid&&x.source!=='magic'&&lastTarget)assert.equal(x.uid,lastTarget,'a distant monster hit the player');}
 assert.ok(run('training').filter(x=>x.kind==='attack').length>0,'other maps still fight');
 console.log(`PASS world walk: ${done.length} kills in 120s, no hits during the 2s walk, only the fought monster hits back`);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
