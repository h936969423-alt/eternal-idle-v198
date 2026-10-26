const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'alignment-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
try{
 for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
 const a=require(path.join(dir,'alignment.js')),d=require(path.join(dir,'alignment-death.js')),e=require(path.join(dir,'engine.js')),r=require(path.join(dir,'spell-rules.js')),time=1000000;
 assert.equal(a.clampAlignment(-32768),-32767);assert.equal(a.changeAlignment(32767,1),32767);assert.equal(a.changeAlignment(-32767,-10000),-32767);
 for(const [n,kind]of [[-1000,'evil'],[-999,'neutral'],[999,'neutral'],[1000,'justice']])assert.equal(a.alignmentKind(n),kind);
 assert.equal(a.alignmentColor(0),'#ffffff');assert.equal(a.alignmentColor(32767),'#3b82f6');assert.equal(a.alignmentColor(-32767),'#ff4d4d');
 for(const [value,delta]of [[1000,-10000],[999,-5000],[-999,-5000],[-1000,0]])assert.equal(a.alignmentKillDelta({trollPlayer:true,_pvpAlignment:value}),delta);
 assert.equal(a.alignmentKillDelta({}),1);for(const field of ['alignmentExempt','pledgeEnemy','siegeEnemy','summonedBy'])assert.equal(a.alignmentKillDelta({[field]:true}),0);
 for(const n of [-32767,0,999,1000])assert.equal(a.justiceHealMultiplier(n),1);assert.equal(a.justiceHealMultiplier(32767),1.2);
 const heal={classicHeal:{baseDice:2,sides:4},justiceHeal:true};assert.equal(r.healingAmount(heal,{int:18},10000,()=>0,1,0),10);assert.equal(r.healingAmount(heal,{int:18},10000,()=>0,1,32767),12);assert.equal(r.healingAmount({...heal,justiceHeal:false},{int:18},10000,()=>0,1,32767),10);assert.equal(r.healingAmount({fullRestore:true,justiceHeal:true},{},17,()=>0,1,32767),17);
 const inventory=()=>({lawful:-10001,bag:{sword:1,locked:1,quest:1},equipment:{weapon:{id:'sword',en:9}},enh:{sword:9},locked:['locked'],affixes:{sword:{bless:true}}});const items={sword:{},locked:{},quest:{noSell:true}};
 let c=inventory();assert.equal(d.chaoticDeathLoss({...c,lawful:-10000},items,time,()=>0),undefined);assert.equal(d.chaoticDeathLoss(c,items,time,()=>.01),undefined);assert.equal(d.chaoticDeathLoss(c,items,time,()=>0,true),undefined);
 const loss=d.chaoticDeathLoss(c,items,time,()=>0);assert.equal(loss.id,'sword');assert.equal(loss.en,9);assert.equal(c.bag.sword,undefined);assert.equal(c.equipment.weapon,undefined);assert.equal(c.bag.locked,1);assert.deepEqual(loss.affix,{bless:true});
 c=inventory();c.bag.sword=2;d.chaoticDeathLoss(c,items,time,()=>0);assert.ok(c.equipment.weapon);assert.equal(c.bag.sword,1);
 function fixture(){const allocation={};let left=e.BASES.mage.pts;for(const key of ['str','dex','con','int','wis','cha']){allocation[key]=Math.min(left,20-e.BASES.mage[key]);left-=allocation[key];}const c=e.createCharacter('正義測試','mage','m',allocation,time);c.lv=99;c.skills=['sk_heal1','sk_disintegrate'];c.hp=1;c.mp=10000;c.lawful=0;e.ensureArena(c,()=>.5,time);return c;}
 c=fixture();const before=c.mp;assert.throws(()=>e.cast(c,'sk_disintegrate',time,()=>.5),/正義/);assert.equal(c.mp,before);assert.ok(!c.spellCooldowns?.attack);
 c=fixture();c.lawful=32767;e.cast(c,'sk_heal1',time,()=>0);const boosted=c.hp;
 c=fixture();e.cast(c,'sk_heal1',time,()=>0);assert.ok(boosted>c.hp);
 c=fixture();c.lawful=-32768;e.ensureArena(c,()=>.5,time);assert.equal(c.lawful,-32767);const roundtrip=JSON.parse(JSON.stringify(c));assert.equal(roundtrip.lawful,-32767);
 // Drive real combat, not just the formula helper; exactly one alignment point per settled death.
 c=fixture();c.skills=['sk_disintegrate'];c.lawful=1000;c.mp=10000;const target=c.arena[c.arenaTarget||0];target.hp=1;e.cast(c,'sk_disintegrate',time,()=>.5);assert.equal(c.lawful,1001);assert.equal(c.kills,1);
 console.log('PASS alignment: thresholds, color, PK deltas, healing, cast gate, inventory loss, save roundtrip and real kill settlement');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
