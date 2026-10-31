const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'map-layout-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
try{
 for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
 const p=require(path.join(dir,'map-pools.js')),e=require(path.join(dir,'engine.js')),time=1000000;
 const NEW=[{x:69,y:52},{x:52,y:82},{x:86,y:82}],entries=[{id:'x',weight:1,enabled:true}];
 const five=[{x:49,y:77},{x:68,y:77},{x:87,y:77},{x:59,y:43},{x:79,y:43}],legacyFive=[{x:54,y:32},{x:83,y:32},{x:54,y:58},{x:83,y:58},{x:54,y:84}];
 // Stock layouts saved before this change become three monsters on the new points.
 for(const spawnPoints of [undefined,five,legacyFive]){const g=p.normalizeMapGeneration({enabled:true,count:5,respawnSeconds:5,respawnRulesVersion:2,spawnMode:'fixed',spawnPoints,entries});assert.equal(g.count,3);assert.equal(g.layoutVersion,3);assert.deepEqual(g.spawnPoints,NEW);}
 const old3=p.normalizeMapGeneration({enabled:true,count:3,respawnSeconds:8,respawnRulesVersion:2,spawnPoints:[{x:56,y:65},{x:80,y:39},{x:83,y:82}],entries});assert.equal(old3.count,3);assert.equal(old3.respawnSeconds,8);assert.deepEqual(old3.spawnPoints,NEW);
 // GM-custom, random, and GM saves made after this change are kept as-is.
 assert.equal(p.normalizeMapGeneration({enabled:true,count:5,respawnSeconds:5,respawnRulesVersion:2,spawnMode:'fixed',spawnPoints:[{x:50,y:30},{x:70,y:30},{x:50,y:60},{x:70,y:60},{x:85,y:84}],entries}).count,5);
 assert.equal(p.normalizeMapGeneration({enabled:true,count:5,respawnSeconds:5,respawnRulesVersion:2,spawnMode:'random',entries}).count,5);
 assert.equal(p.normalizeMapGeneration({enabled:true,count:5,respawnSeconds:5,respawnRulesVersion:2,layoutVersion:3,spawnMode:'fixed',spawnPoints:five,entries}).count,5);
 const def=p.defaultMapGeneration('training');assert.equal(def.count,3);assert.deepEqual(def.spawnPoints,NEW);
 assert.deepEqual(p.migratedSpawnPoint(def,1,{x:68,y:77}),NEW[1]);assert.deepEqual(p.migratedSpawnPoint(def,1,{x:61,y:44}),{x:61,y:44});
 // A field and a dungeon map both spawn three monsters on the new points.
 const raw=require(path.join(dir,'gamedata.json'));
 for(const zone of [raw.mapCategories.wild.find(z=>raw.maps[z.v]?.length).v,raw.mapCategories.dungeon.find(z=>raw.maps[z.v]?.length).v]){
  const allocation={};let left=e.BASES.knight.pts;for(const key of ['str','dex','con','int','wis','cha']){allocation[key]=Math.min(left,20-e.BASES.knight[key]);left-=allocation[key];}const c=e.createCharacter('地圖測試','knight','m',allocation,time);c.lv=50;c.zone=zone;c.mapAccess=undefined;e.ensureArena(c,()=>.5,time);
  assert.equal(c.arena.length,3,zone);assert.deepEqual(c.arena.map(m=>m.spawnPoint),NEW,zone);
  // An old five-monster arena keeps its extras only until they die, then shrinks to three.
  c.arena.push(structuredClone(c.arena[1]),structuredClone(c.arena[2]));c.arena[1].spawnPoint={...five[1]};e.ensureArena(c,()=>.5,time);
  assert.deepEqual(c.arena[1].spawnPoint,NEW[1]);assert.ok(c.arena[3].retiring&&c.arena[4].retiring);
  c.arena[3].hp=0;c.arena[4].hp=0;e.ensureArena(c,()=>.5,time);assert.equal(c.arena.length,3,zone);
 }
 console.log('PASS map layout: three monsters by default, legacy migration, GM layouts kept, field and dungeon arenas');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
