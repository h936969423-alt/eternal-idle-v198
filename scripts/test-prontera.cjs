const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),ts=require('typescript');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'prontera-'));
try{
 const source=fs.readFileSync('lib/game/prontera-navigation.ts','utf8');
 fs.writeFileSync(path.join(tmp,'navigation.cjs'),ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText);
 fs.copyFileSync('lib/game/prontera.json',path.join(tmp,'prontera.json'));
 const {PRONTERA:c,cityWalkable,cityPath,CITY_VENDOR}=require(path.join(tmp,'navigation.cjs'));
 assert.equal(c.safeZone,true);assert.equal(c.collision.rows.length,64);assert(c.collision.rows.every(r=>r.length===64));
 for(const target of [...c.npcs,...c.portals]){const steps=cityPath(c.spawn,target);assert(steps.length,target.id);let prev=c.spawn;for(const p of steps){assert(cityWalkable(p));assert.equal(Math.abs(p.x-prev.x)+Math.abs(p.y-prev.y),1);prev=p;}assert.deepEqual(prev,{x:target.x,y:target.y});}
 assert.deepEqual(cityPath(c.spawn,{x:32,y:32}),[]);assert.deepEqual(cityPath(c.spawn,{x:-1,y:32}),[]);assert(!cityWalkable({x:32.1,y:32}));
 for(const b of c.buildings){assert(fs.existsSync('public/assets/prontera/'+b.id+'.svg'));for(let y=b.y;y<b.y+b.height;y++)for(let x=b.x;x<b.x+b.width;x++)assert(!cityWalkable({x,y}));}
 assert(c.portals.every(p=>!p.enabled&&p.destinationSpawn===null));
 const hub=require('../lib/game/npc-hub-data.json');for(const id of Object.values(CITY_VENDOR))assert(hub.npcs.some(n=>n.id===id),id);
 console.log('PASS Prontera: all NPCs and entrances reachable, obstacle avoidance, blocked/out-of-bounds targets, assets, inactive portals, existing vendor IDs');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
