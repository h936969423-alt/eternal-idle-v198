// 黑暗妖精爆擊「血刃十字斬」: only the Dark Elf's own physical critical hits trigger it, it starts on
// the critical number's frame (never delays it), each hit plays once, and it is gone after 420ms.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'crit-slash-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
try{
 fs.writeFileSync(path.join(dir,'crit-slash.js'),ts.transpileModule(fs.readFileSync(path.join(root,'lib/game/crit-slash.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);
 const S=require(path.join(dir,'crit-slash.js'));
 const hit=(o)=>({kind:'attack',critical:true,slot:0,uid:'A',seq:1,shownAt:1000,...o});
 // Which hits count.
 assert.ok(S.isPlayerCriticalHit(hit({})),'normal attack critical');
 assert.ok(S.isPlayerCriticalHit(hit({source:'physical',skill:'sk_dark_crit'})),'會心一擊');
 for(const [o,why] of [[{critical:false},'not critical'],[{miss:true},'miss'],[{weaponProc:true},'weapon proc'],[{source:'magic'},'spell'],[{source:'monster'},'monster hit'],[{source:'pet'},'pet'],[{source:'summon'},'summon'],[{source:'doll'},'doll'],[{kind:'hurt'},'player hurt'],[{slot:undefined},'no target']])
  assert.ok(!S.isPlayerCriticalHit(hit(o)),why);
 // Each critical hit plays once, only while still fresh.
 const floats=[hit({seq:1,shownAt:1000}),hit({seq:2,shownAt:400}),hit({seq:3,critical:false})];
 assert.deepEqual(S.newCritSlashes(floats,new Set(),1010).map(f=>f.seq),[1],'fresh critical only');
 assert.deepEqual(S.newCritSlashes(floats,new Set([1]),1010).map(f=>f.seq),[],'already played');
 assert.deepEqual(S.newCritSlashes(floats,new Set(),1000+S.CRIT_SLASH_MS).map(f=>f.seq),[],'too old to start');
 // Drawing: visible from t=0 (same frame as the number), finished at 420ms, scales with the arena.
 const calls=[];const ctx=new Proxy({},{get:(o,k)=>k in o?o[k]:(...a)=>calls.push([k,...a]),set:(o,k,v)=>{o[k]=v;return true;}});
 assert.equal(S.drawCritSlash(ctx,0,100,80,1),true,'drawn at t=0');assert.ok(calls.some(c=>c[0]==='stroke'),'first slash stroked at once');
 for(const t of [49,50,120,300,419])assert.equal(S.drawCritSlash(ctx,t,100,80,1),true,'t='+t);
 assert.equal(S.drawCritSlash(ctx,S.CRIT_SLASH_MS,100,80,1),false,'gone at 420ms');assert.equal(S.drawCritSlash(ctx,-1,100,80,1),false);
 calls.length=0;S.drawCritSlash(ctx,60,100,80,2);const moves=calls.filter(c=>c[0]==='moveTo').map(c=>Math.hypot(c[1]-100,c[2]-80));assert.ok(Math.max(...moves)>60,'slash length scales with the arena');
 assert.deepEqual(S.critSparks(7),S.critSparks(7),'sparks are stable per hit');assert.notDeepEqual(S.critSparks(7),S.critSparks(8));
 assert.equal(S.CRIT_SLASH_OFFSET.x<0,true,'centred toward the player side of the monster');
 // Mounted only for Dark Elves.
 const arena=fs.readFileSync(path.join(root,'app/battle-arena.tsx'),'utf8');assert.ok(arena.includes("{c.cls==='dark'&&<DarkElfCritSlash view={view} arena={arenaRef}/>}"));
 console.log('PASS dark elf crit slash: own physical crits only, once per hit, starts with the number, 420ms, scales with the arena, Dark Elf only');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
