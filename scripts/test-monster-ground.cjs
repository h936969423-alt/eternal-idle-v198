const fs=require('fs'),path=require('path'),ts=require('typescript'),assert=require('node:assert/strict');
const dir=fs.mkdtempSync('/tmp/monster-ground-');
try{
 fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
 fs.copyFileSync('lib/game/monster-ground-anchors.json',path.join(dir,'monster-ground-anchors.json'));
 fs.writeFileSync(path.join(dir,'monster-ground.js'),ts.transpileModule(fs.readFileSync('lib/game/monster-ground.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);
 const {monsterGroundOffset,sourceMonsterGroundOffset}=require(path.join(dir,'monster-ground.js'));
 const data=require('../lib/game/gamedata.json'),meta=require('../lib/game/combat-animation.json'),anchors=require('../lib/game/monster-ground-anchors.json');
 let frames=0,moved=0;
 for(const name of new Set(Object.values(data.mobs).map(m=>m.n))){for(const clips of Object.values(meta[name]||{})){
  if(!clips.idle)continue;const idle=clips.idle.body,origin=anchors.atlases[idle.src]?.find(Boolean);if(!origin)continue;
  for(const action of ['idle','attack','skill','hurt']){const a=clips[action]?.body;if(!a)continue;
   for(let i=0;i<a.count;i++){const foot=anchors.atlases[a.src]?.[i];if(!foot)continue;const [dx,dy]=monsterGroundOffset(a,i,idle);assert.ok(Math.abs((foot[0]+dx)/a.w-origin[0]/idle.w)<1e-9);assert.ok(Math.abs((foot[1]+dy)/a.h-origin[1]/idle.h)<1e-9);frames++;if(Math.abs(dx)+Math.abs(dy)>5)moved++;}
  }
 }}
 let source=0;const defs=require('../public/assets/dragon381/definitions.json').nodes;
 for(const [gfx,origin] of Object.entries(anchors.sourceIdle)){const node=defs[gfx];for(const [id,foot] of Object.entries(anchors.sourceFrames)){if(!id.startsWith(node.base+'-'))continue;const ix=id.lastIndexOf(':'),[dx,dy]=sourceMonsterGroundOffset(Number(gfx),id.slice(0,ix),Number(id.slice(ix+1)));assert.equal(foot[0]+dx,origin[0]);assert.equal(foot[1]+dy,origin[1]);source++;}}
 assert.ok(frames>5000&&moved>100&&source>1000);
 assert.deepEqual(monsterGroundOffset({src:'missing',w:80,h:80,count:1},0,{src:'missing',w:80,h:80,count:1}),[0,0]);assert.deepEqual(sourceMonsterGroundOffset(-1,'missing',0),[0,0]);
 console.log(`PASS: ${frames} alive monster frames retain the idle ground contact; ${moved} shifted frames corrected; ${source} SPR frame contacts and missing-asset fallback verified.`);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
