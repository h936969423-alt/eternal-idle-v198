// A monster's chance to hit the player depends on the monster and the player's AC, not on the
// player's level (original Lineage). A level-19 elf with AC -2 in Giran dungeon 2F gets hit often.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'monster-hit-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
try{
 for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
 const e=require(path.join(dir,'engine.js')),t=1000000;
 function hitRate(level,ac){
  let seed=99;const rng=()=>((seed=(seed*1103515245+12345)%2147483648)/2147483648);
  const base=e.BASES.elf,al={};let p=base.pts;for(const k of ['str','dex','con','int','wis','cha']){al[k]=Math.min(p,20-base[k]);p-=al[k];}
  const c=e.createCharacter('命中','elf','f',al,t);c.lv=level;c.autoPotion=false;c.zone='zone_19';const s={v:1,at:t,characters:[c],active:c.id};
  e.ensureArena(c,rng,t);c.running=true;
  // Same AC and ER for every level so only the level differs.
  c.buffs.test_ac={until:t+1e9,d:{ac:e.stats(c,t).ac-ac,er:-e.stats(c,t).er}};
  // The player never kills anything, so the same monsters keep attacking.
  c.buffs.status_stun={until:t+1e9,d:{stun:1}};
  for(const m of c.arena){m.hp=1e9;m.maxHp=1e9;}
  assert.equal(e.stats(c,t).ac,ac,'test AC');
  const seen=new Map();
  for(let i=0;i<300;i++){c.hp=e.stats(c,s.at).maxHp;e.advance(s,s.at+1000,rng);for(const x of c.events||[])seen.set(x.seq,x);}
  const hurt=[...seen.values()].filter(x=>x.kind==='hurt'&&x.mob);
  assert.ok(hurt.length>100,'monster attacks: '+hurt.length);
  return hurt.filter(x=>!x.miss).length/hurt.length;
 }
 const low=hitRate(19,-2),high=hitRate(60,-2),armored=hitRate(19,-40);
 assert.ok(low>.6,`AC -2 level 19 should be hit often, got ${(low*100).toFixed(1)}%`);
 assert.ok(Math.abs(low-high)<.05,`player level must not change monster hit rate: lv19 ${(low*100).toFixed(1)}% vs lv60 ${(high*100).toFixed(1)}%`);
 assert.ok(armored<low/2,`lower AC still protects: AC -40 ${(armored*100).toFixed(1)}% vs AC -2 ${(low*100).toFixed(1)}%`);
 console.log(`PASS monster hit rate: AC -2 lv19 ${(low*100).toFixed(1)}%, lv60 ${(high*100).toFixed(1)}%, AC -40 ${(armored*100).toFixed(1)}%`);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
