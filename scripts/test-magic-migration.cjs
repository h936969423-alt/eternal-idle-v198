const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),crypto=require('node:crypto');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync('/tmp/magic-migration-');
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
process.on('exit',()=>fs.rmSync(dir,{recursive:true,force:true}));
// Compile the real modules together: polymorph.ts and polymorph.json share a
// basename, so a custom .ts require hook alone would select the wrong file.
for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
const v=require(path.join(dir,'magic-visuals.js')),p=require(path.join(dir,'combat-presentation.js')),e=require(path.join(dir,'engine.js'));
const fx=require('../lib/game/magic-fx.json'),manifest=require('../lib/game/magic-import.json');
assert.equal(manifest.commit,'5f00f4a86389aaa7309c24d7a7c1ab060c47b500');
for(const name of manifest.importedEffects){const c=fx[name];assert.ok(c.frames.length&&c.fps>0,name);for(const url of v.magicVisualPaths(c)){
 if(url.startsWith('/assets/target-spells-v1/')){const integrity=require('../lib/game/target-spell-assets.json'),file=url.split('/').at(-1),body=fs.readFileSync(path.join(root,'public/assets/target-spells-v1',file));assert.equal(crypto.createHash('sha256').update(body).digest('hex'),integrity.files[file],url);continue;}
 if(url.startsWith('/assets/dasu-v1/')){const integrity=require('../lib/game/dasu-asset-integrity.json'),file=url.split('/').at(-1),body=fs.readFileSync(path.join(root,'public/assets/dasu-v1',file));assert.equal(crypto.createHash('sha256').update(body).digest('hex'),integrity.files[file],url);continue;}
 const rel=decodeURIComponent(url.replace('/assets/fx-import/','')),entry=manifest.files[rel];assert.ok(entry,url);
 const body=fs.readFileSync(path.join(root,'public/assets/fx-import',rel));
 assert.equal(body.length,entry.size,url);assert.equal(crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${body.length}\0`),body])).digest('hex'),entry.sha,url);
}}
for(const [name,dirs] of [['光箭',4],['燃燒的火球',8],['冰裂術',8]]){
 const config=fx[name];assert.equal(config.directions.length,dirs);
 for(let dir=0;dir<8;dir++){const a=dir*Math.PI/4,clip=v.magicDirection(config,Math.sin(a),-Math.cos(a));assert.ok(clip.frames.length);assert.equal(clip.frames.length,config.frames.length);}
}
assert.equal(fx['究極光裂術'].layers.length,2);assert.ok(v.magicEffectLifetime({skill:'sk_abs_barrier'})>=fx['絕對屏障'].frames.length*1000/fx['絕對屏障'].fps,'source animations remain alive through the final frame');assert.equal(fx['冰裂術'].shadowDirections.length,8);
assert.equal(v.magicFrame(0,16,21),0);assert.equal(v.magicFrame(1313,16,21),-1);assert.equal(v.magicFrame(1313,16,21,true),0);
assert.equal(v.magicFlightMs(0),140);assert.equal(v.magicFlightMs(320),200);assert.equal(v.magicFlightMs(5000),380);
for(const [skill,duration] of [['sk_lightarrow',140],['sk_fireball',380]]){
 assert.ok(e.DATA.skills[skill],skill);
 const attack={seq:1,at:0,due:1000,kind:'attack',source:'magic',skill,slot:0,uid:'old',mobHp:0,damage:30,hp:100,mp:80};
 assert.ok(v.isFlyingMagic(attack));
 const queue=[attack,{seq:2,at:0,due:1000,kind:'loot',uid:'old',slot:0,hp:100,mp:80},{seq:3,at:0,due:1000,kind:'spawn',slot:0,uid:'new',spawn:{uid:'new',id:'test',hp:99,clock:0},hp:100,mp:80}],pending=[];
 let view={hp:100,mp:100,arena:[{uid:'old',id:'test',hp:30,clock:0}],floats:[]};
 function tick(now){const out=p.drainCombatPresentation(queue,pending,now,false,()=>duration);for(const event of out)view=p.applyCombatViewEvent(view,event,now);return out;}
 const launch=tick(1000);assert.equal(launch.length,1);assert.equal(launch[0].visualPhase,'launch');assert.equal(launch[0].visualFlightMs,duration);assert.equal(view.arena[0].hp,30);assert.equal(view.mp,80);assert.equal(view.floats.length,0);
 tick(1000+duration-1);assert.equal(view.arena[0].uid,'old');assert.equal(view.arena[0].hp,30);
 assert.deepEqual(tick(1000+duration).map(e=>e.kind),['attack','loot','spawn']);assert.equal(view.floats.length,1);assert.equal(view.arena[0].uid,'new');assert.equal(tick(2000).length,0);
}
const t=1000000,b=e.BASES.mage,allocation={};let left=b.pts;for(const k of ['str','dex','con','int','wis','cha']){allocation[k]=Math.min(left,20-b[k]);left-=allocation[k];}
const c=e.createCharacter('移植測試','mage','m',allocation,t),save=e.emptySave(t);save.characters=[c];save.active=c.id;c.lv=80;c.skills=[];c.bag={bk_heal1:1,'bk_heal1@other':1,bk_shield:1};c.gold=12345;
// Use the selected copy, never a different stack of the same spellbook.
e.action(save,{type:'useItem',item:'bk_heal1@other'},t);assert.equal(c.bag.bk_heal1,1);assert.equal(c.bag['bk_heal1@other']||0,0);assert.ok(c.skills.includes('sk_heal1'));assert.equal(c.gold,12345);
assert.throws(()=>e.action(save,{type:'useItem',item:'bk_heal1'},t),/已學會/);assert.equal(c.bag.bk_heal1,1);
assert.throws(()=>e.action(save,{type:'learn',skill:'sk_shield',book:'bk_heal1'},t),/對應技能書/);assert.equal(c.bag.bk_shield,1);
c.locked=['bk_shield'];assert.throws(()=>e.action(save,{type:'learn',skill:'sk_shield',book:'bk_shield'},t),/未鎖定/);assert.equal(c.bag.bk_shield,1);
c.locked=[];e.action(save,{type:'useItem',item:'bk_shield'},t);assert.ok(c.skills.includes('sk_shield'));assert.equal(c.gold,12345);
console.log(`PASS: ${manifest.importedEffects.length} spell effects / ${Object.keys(manifest.files).length} SHA-verified frames; directions, shadows, layers, frame cleanup, 140–380ms launch/impact/loot ordering, exact book consumption, duplicates, forged/locked books and retained gold/skills.`);

