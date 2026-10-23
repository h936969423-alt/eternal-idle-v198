const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const {playerSpriteLayout,arrowFlight,PLAIN_ARROW,playerSpriteFootOffset}=require('../lib/game/player-sprite-layout.ts');
const l=playerSpriteLayout('darkelf');assert.deepEqual(l.viewBox,[113,102]);assert.equal(l.width,59);assert.equal(l.height,66);assert.equal(playerSpriteLayout('deathknight'),undefined);
// Source alpha bounds measured from actual PNGs: DE 14,5–33,61; DK 32,32–76,90.
const elfFeet=l.y+61,knightFeet=90;assert.ok(Math.abs(elfFeet-knightFeet)<=1);
assert.ok(Math.abs(56/58-1)<.05,'natural source bodies are within five percent at one pixel scale');
for(const [to,angle] of [[{x:100,y:0},0],[{x:0,y:100},90],[{x:-100,y:0},180],[{x:0,y:-100},-90]])assert.equal(arrowFlight({x:0,y:0},to,1).angle,angle);
for(const interval of [.2,.5,1,1.2,2]){const f=arrowFlight({x:0,y:0},{x:200,y:0},interval);assert.equal(f.delay,interval*500);assert.ok(f.delay+f.duration<5000);}
assert.ok(fs.existsSync(require('node:path').join(__dirname,'../public',PLAIN_ARROW)));assert.ok(fs.readFileSync(require('node:path').join(__dirname,'../public',PLAIN_ARROW),'utf8').includes('viewBox="0 0 32 8"'));
assert.ok(Math.abs(playerSpriteFootOffset('darkelf','/assets/polymorph-cast/morphanim/黑暗精靈/attack_0.png')+63.947368421-61)<.01);assert.equal(playerSpriteFootOffset('deathknight','irrelevant'),0);
const projectile=fs.readFileSync(require('node:path').join(__dirname,'../app/combat-projectile.tsx'),'utf8');assert.ok(!projectile.includes('/plain/${i}'));assert.ok(projectile.includes('event.weaponProc'));assert.ok(projectile.includes('data-monster-uid'));
console.log('PASS: source-scale alignment, foot anchor, unchanged DK/other forms, directional arrow, release timing, existing asset and stale-target guard.');
