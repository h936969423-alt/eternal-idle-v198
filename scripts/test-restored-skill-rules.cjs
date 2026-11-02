// Original rules (legacy-skills-v2): 魔法屏障 cannot be recast for 3 seconds after it blocks a spell,
// and a failed 衝擊之暈 reports 衝暈失敗 (miss, failed roll, or an already-stunned target).
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'restored-rules-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
try{
 for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
 const e=require(path.join(dir,'engine.js')),CD=require(path.join(dir,'skill-cooldown.js')),raw=require(path.join(dir,'gamedata.json'));
 const at=1000000;
 const make=(cls,skills)=>{const alloc={};let left=e.BASES[cls].pts;for(const k of ['str','dex','con','int','wis','cha']){alloc[k]=Math.min(left,20-e.BASES[cls][k]);left-=alloc[k];}const c=e.createCharacter('規則',cls,'m',alloc,at);c.lv=99;c.lawful=32767;c.skills=skills;c.zone='training';c.mp=100000;c.running=false;e.ensureArena(c,()=>.5,at);c.arena.forEach(t=>{t.hp=t.maxHp=1000000;delete t.effects;});return c;};
 // 魔法屏障
 {const c=make('mage',['sk_magic_shield','sk_lightarrow']);c.magicBarrierCooldown=at+3000;
  assert.throws(()=>e.cast(c,'sk_magic_shield',at+2999,()=>.5),/冷卻/,'cannot recast within 3s of breaking');
  assert.ok(CD.skillReadyAt(c,'sk_magic_shield')>=at+3000,'the button shows the 3s wait');
  e.cast(c,'lw_skill_160',at+3000,()=>.5);assert.ok(c.buffs.sk_magic_shield?.d.magicBarrier,'recast allowed after 3s (also by its Lineage W id)');
  assert.ok(CD.skillReadyAt(c,'sk_lightarrow')<at+3000,'other spells are not delayed');}
 // 衝擊之暈
 const stun=(rng,effects)=>{const c=make('knight',['sk_shock_stun']);const w=Object.entries(raw.items).find(([,w])=>w.type==='wpn'&&!w.isBow&&!w.isArrow&&(w.twohanded||w.w2h||w.wcat==='tohandsword'));c.equipment.weapon={id:w[0],en:0};if(effects)c.arena.forEach(t=>t.effects=structuredClone(effects));const after=c.eventSeq||0;e.cast(c,'sk_shock_stun',at,rng);return {c,fresh:c.events.filter(x=>x.seq>after)};};
 {const {c,fresh}=stun(()=>.5);assert.equal(fresh.filter(x=>x.effect==='衝暈失敗').length,1,'failed roll shows 衝暈失敗 once');assert(!c.arena.some(t=>t.effects?.stun));}
 {const {c,fresh}=stun(()=>.05);assert(c.arena.some(t=>t.effects?.stun),'stun lands');assert.equal(fresh.filter(x=>x.effect==='衝暈失敗').length,0,'no failure text on success');}
 {const until=at+5000,{c,fresh}=stun(()=>.05,{stun:{until,value:1}});assert.equal(fresh.filter(x=>x.effect==='衝暈失敗').length,1,'an already-stunned target counts as a failure');assert(c.arena.every(t=>t.effects.stun.until===until),'existing stun is not refreshed');}
 console.log('PASS original rules: 魔法屏障 3s lockout after blocking a spell; 衝擊之暈 shows 衝暈失敗 on a failed roll or an already-stunned target, never on success');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
