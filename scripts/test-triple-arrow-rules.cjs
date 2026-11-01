// Triple Arrow: three full normal attacks, each with its own hit and critical roll; one cast uses exactly
// one arrow; no equipment effects (weapon magic, W/mythic procs, elemental damage, doll attacks).
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'triple-rules-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
try{
 for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
 const e=require(path.join(dir,'engine.js')),mc=require(path.join(dir,'monster-config.js')),auto=require(path.join(dir,'auto-config.js')),now=1000000,bow='lw_weapon_919284';
 function fixture(){const base=e.BASES.elf,al={};let left=base.pts;for(const k of ['str','dex','con','int','wis','cha']){al[k]=Math.min(left,20-base[k]);left-=al[k];}
  const c=e.createCharacter('三重矢','elf','f',al,now);c.lv=99;c.attrs.con=100000;c.autoPotion=false;c.equipment={weapon:{id:bow,en:7}};c.enh={[bow]:7};c.bag={[bow]:1,wpn_22:1000};c.skills=['sk_elf_triple'];
  c.autoConfig={...auto.autoConfig(c),attack:'',heal:'',convert:'',opener:'',aux:{},buffs:[]};c.zone='training';e.ensureArena(c,()=>.5,now);
  for(const t of c.arena){t.definition={...mc.defaultMonster(t.id),hp:1e9,hpRegen:0,damageMin:0,damageMax:0,spells:[]};t.hp=t.maxHp=1e9;}
  c.hp=e.stats(c,now).maxHp;c.mp=e.stats(c,now).maxMp;return c;}
 let seed=11;const rng=()=>((seed=(seed*1103515245+12345)%2147483648)/2147483648);
 let casts=0,mixedHit=0,mixedCrit=0,shots=0;
 for(let i=0;i<300;i++){
  const c=fixture(),arrows=c.bag.wpn_22,at=now+i*10000;
  c.events=[];e.cast(c,'sk_elf_triple',at,rng);casts++;
  const ev=c.events.filter(x=>x.kind==='attack'&&x.skill==='lw_skill_450'&&!x.weaponProc);
  assert.equal(ev.length,3,'three arrows per cast');shots+=3;
  assert.equal(c.bag.wpn_22,arrows-1,'one cast uses exactly one arrow');
  assert.equal(c.events.filter(x=>x.weaponProc).length,0,'no weapon procs or weapon magic');
  assert.equal(c.events.filter(x=>x.source==='doll').length,0,'no doll attack');
  const hits=ev.map(x=>!x.miss),crits=ev.map(x=>!!x.critical);
  if(hits.some(Boolean)&&hits.some(x=>!x))mixedHit++;
  if(crits.some(Boolean)&&crits.some(x=>!x))mixedCrit++;
 }
 assert.ok(mixedHit>0,'each arrow rolls its own hit: some casts mix hits and misses');
 assert.ok(mixedCrit>0,'each arrow rolls its own critical: some casts mix critical and normal hits');
 console.log(`PASS triple arrow rules: ${casts} casts × 3 arrows, 1 arrow each, no equipment effects; ${mixedHit} casts mixed hit/miss, ${mixedCrit} mixed critical`);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
