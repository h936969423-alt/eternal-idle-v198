// GM monster editor: hit bonus, ER, DR, MR and final damage % are editable, default to the source
// monster, keep older saved definitions valid, and reach combat.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'gm-monster-stats-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
try{
 for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
 const cfg=require(path.join(dir,'monster-config.js')),rt=require(path.join(dir,'monster-runtime.js')),rules=require(path.join(dir,'attack-rules.js')),raw=require(path.join(dir,'gamedata.json'));
 const id='ghoul',src=raw.mobs[id];
 for(const key of ['hit','er','dr','mr','damageAmpPct'])assert.ok(cfg.MONSTER_FIELDS[key],'GM field '+key);
 // Defaults come from the source monster.
 const base=cfg.defaultMonster(id);
 assert.equal(base.hit,src.hit||0);assert.equal(base.mr,src.mr||0);assert.equal(base.damageAmpPct,0);
 // A definition saved before these fields existed still validates and keeps source values.
 const old={...base};for(const key of cfg.MONSTER_COMBAT_KEYS)delete old[key];
 const upgraded=cfg.validateMonster(old);
 assert.equal(upgraded.hit,src.hit||0);assert.equal(upgraded.mr,src.mr||0);assert.equal(upgraded.damageAmpPct,0);
 assert.equal(cfg.withMonsterDefaults(old).hit,src.hit||0,'editor shows source value for old definitions');
 // Range checks.
 assert.throws(()=>cfg.validateMonster({...base,er:96}),/0–95/);
 assert.throws(()=>cfg.validateMonster({...base,damageAmpPct:1.5}),/整數/);
 // Saved values reach combat data.
 const def=cfg.validateMonster({...base,hit:9,er:20,dr:5,mr:60,damageAmpPct:100});
 const c={arena:[{uid:'u',id,hp:100,definition:def}],arenaTarget:0};
 const m=rt.monsterData(c,id,c.arena[0]);
 assert.deepEqual([m.hit,m.er,m.dr,m.mr,m.damageAmpPct],[9,20,5,60,100]);
 // Old definitions without the fields still fight with the source stats.
 const legacy=rt.monsterData({arena:[{uid:'v',id,hp:100,definition:old}],arenaTarget:0},id);
 assert.equal(legacy.hit,src.hit);assert.equal(legacy.mr,src.mr);
 // Final damage % doubles a landed hit (same dice, no defence).
 const fixed=()=>.5;
 const plain=rules.monsterStrike({...m,damageAmpPct:0},1,10,0,0,fixed),amped=rules.monsterStrike(m,1,10,0,0,fixed);
 assert.ok(!plain.miss&&!amped.miss,'hits land');
 assert.equal(amped.damage,plain.damage*2,`final damage 100% doubles ${plain.damage} -> ${amped.damage}`);
 console.log(`PASS GM monster combat stats: five fields, source defaults, legacy definitions, ranges, final damage ${plain.damage}→${amped.damage}`);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
