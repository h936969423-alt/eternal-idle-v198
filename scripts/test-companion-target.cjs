// Pets and summons fight beside the player: they only attack while the player is hunting, and
// every hit lands on the monster the player is attacking at that moment (never the nearest one).
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'companion-target-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
try{
 for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
 const e=require(path.join(dir,'engine.js')),roster=require(path.join(dir,'pet-roster.js')),t=1000000;
 function make(){const base=e.BASES.knight,al={};let p=base.pts;for(const k of ['str','dex','con','int','wis','cha']){al[k]=Math.min(p,20-base[k]);p-=al[k];}const c=e.createCharacter('同目標','knight','m',al,t);c.lv=60;c.attrs.cha=60;c.attrs.con=10000;c.hp=e.stats(c,t).maxHp;c.autoPotion=false;c.zone='training';e.ensureArena(c,()=>.5,t);const s={v:1,at:t,characters:[c],active:c.id};const pet=roster.acquirePet(c,'狼',t);e.action(s,{type:'petSummon',pet:pet.id||Object.keys(c.pets)[0]},t);return {c,s};}
 function run(c,s,seconds){const seen=new Map();for(let i=0;i<seconds;i++){e.advance(s,s.at+1000,()=>.5);for(const x of c.events||[])seen.set(x.seq,x);}return [...seen.values()].sort((a,b)=>a.seq-b.seq);}

 // 1. Not hunting: the pet never attacks and never picks a target.
 let {c,s}=make();assert.ok(c.arena.length>=2,'training map needs at least two monsters, got '+c.arena.length);
 c.running=false;let events=run(c,s,20);
 assert.equal(events.filter(x=>x.kind==='attack'&&x.source==='pet').length,0,'pet attacked while the player was not hunting');
 assert.equal(e.petSnapshot(c,s.at)[0].targetUid,undefined,'pet chose a target while the player was not hunting');

 // 2. Hunting with unkillable monsters: every pet hit lands on the player's target, which is not
 //    the monster nearest the pet.
 ({c,s}=make());for(const m of c.arena){m.hp=1e9;m.maxHp=1e9;}
 const slot=c.arena.length-1;c.arenaTarget=slot;c.running=true;
 const p=Object.values(c.pets)[0];p.x=c.arena[0].spawnPoint?.x??20;p.y=c.arena[0].spawnPoint?.y??60;
 events=run(c,s,30);
 const playerUid=c.arena[slot].uid,petHits=events.filter(x=>x.kind==='attack'&&x.source==='pet');
 assert.ok(petHits.length>5,'pet attacks: '+petHits.length);
 assert.ok(events.some(x=>x.kind==='attack'&&!x.source||x.source==='physical'),'player attacked');
 const wrong=petHits.filter(x=>x.uid!==playerUid);
 assert.equal(wrong.length,0,`pet hit ${wrong.length} times on another monster (${[...new Set(wrong.map(x=>x.uid))].join(',')}) instead of ${playerUid}`);
 assert.equal(e.petSnapshot(c,s.at)[0].targetUid,playerUid,'pet snapshot target follows the player');

 // 3. After a kill the pet waits out the same retarget pause as the player.
 ({c,s}=make());c.running=true;c.retargetAt=s.at+1e6;for(const m of c.arena){m.hp=1e9;m.maxHp=1e9;}
 events=run(c,s,5);
 assert.equal(events.filter(x=>x.kind==='attack'&&(x.source==='pet'||x.source==='summon')).length,0,'companion attacked during the retarget pause');

 console.log(`PASS companion target: idle when not hunting, ${petHits.length} pet hits all on the player's target, waits during retarget pause`);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
