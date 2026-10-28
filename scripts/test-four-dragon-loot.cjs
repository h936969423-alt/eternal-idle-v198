const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync('/tmp/four-dragon-loot-');
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
for(const name of fs.readdirSync(path.join(root,'lib/game'))){const f=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(f,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText+(name==='engine.ts'?'\nexports.__award=award;':''));}
const load=n=>require(path.join(dir,n));
function component(file){const mod={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path.join(root,'app',file+'.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText)(k=>k.startsWith('@/lib/game/')?load(k.slice(11)):require(k),mod,mod.exports);return mod.exports;}
try{
 const e=load('engine'),loot=load('four-dragon-loot'),safety=load('enhancement-safety'),gear=load('gear'),hybrid=load('hybrid-loot'),appearance=load('loot-appearance'),preview=load('boss-drop-preview').bossDropPreview,active=load('dragon-availability').ACTIVE_DRAGON381;
 const zone=active[0].zone,now=Date.now(),pools=loot.fourDragonPools(undefined,now);
 assert.deepEqual(pools.map(g=>[g.rank,g.chance,g.min,g.max]),[['advanced',80,1,8],['rare',40,1,5],['hero',10,1,2]]);
 for(const g of pools){assert.equal(g.books,true,'all three tiers include books');assert(g.items.some(id=>e.DATA.items[id].type==='wpn'));assert(g.items.some(id=>e.DATA.items[id].type==='arm'));assert(g.items.some(id=>e.DATA.items[id].slot==='belt'));assert(g.items.some(id=>e.DATA.items[id].slot==='ring'));assert.equal(g.items.some(id=>e.DATA.items[id].type==='skillbk'),g.books);}
 for(const family of new Set(load('dragon381-registry.json').map(d=>d.family)))assert(load('dragon381-registry.json').some(d=>d.family===family&&loot.isFourDragonZone(d.zone)));
 const boundaries=[.8,.4,.1];assert.deepEqual(loot.rollFourDragonLoot(zone,undefined,()=>boundaries.shift(),now),[]);
 assert.deepEqual(loot.rollFourDragonLoot('training',undefined,()=>0,now),[]);
 const counts=drops=>pools.map(g=>drops.filter(d=>g.items.includes(d.item)).reduce((n,d)=>n+d.quantity,0));
 assert.deepEqual(counts(loot.rollFourDragonLoot(zone,undefined,()=>0,now)),[1,1,1]);
 const draws=pools.flatMap(g=>[0,.999999,...Array(g.max).fill(0)]);
 assert.deepEqual(counts(loot.rollFourDragonLoot(zone,undefined,()=>draws.shift(),now)),[8,5,2]);
 const changed=pools[0].items.find(id=>e.DATA.items[id].type==='wpn'),config={items:{[changed]:{rarity:'hero'}}};
 assert(!loot.fourDragonPools(config,now)[0].items.includes(changed));assert(loot.fourDragonPools(config,now)[2].items.includes(changed));
 const make=()=>{const b=e.BASES.knight,a={};let left=b.pts;for(const k of ['str','dex','con','int','wis','cha']){a[k]=Math.min(left,20-b[k]);left-=a[k];}return e.createCharacter('四龍測試','knight','m',a,now);};
 const c=make();c.zone=zone;e.ensureArena(c,()=>.5,now);const room=c.bossRooms[zone];room.dropDefinition={id:zone,timing:'complete',drops:[],hybrid:hybrid.defaultHybridRule(99,'world')};
 c.arena.forEach(m=>m.hp=0);c.arenaTarget=0;e.__award(c,c.arena[0].id,()=>0,now);
 const drops=Object.entries(c.lastBossVictory.drops).map(([item,quantity])=>({item,quantity}));
 assert.deepEqual(counts(drops),[1,1,1]);assert.equal(c.lastBossVictory.drops.mat_boss_crystal,1);
 const before=JSON.stringify(c.bag);e.__award(c,c.arena[0].id,()=>0,now);assert.equal(JSON.stringify(c.bag),before,'death settles exactly once');
 assert.deepEqual(preview(zone,c,undefined,now).dragonGroups.map(g=>g.items),pools.map(g=>g.items));assert.equal(preview(zone,c,undefined,now).equipment.length,0);
 const html=renderToStaticMarkup(React.createElement(component('map-monsters').MonsterDrops,{id:zone,worldBoss:true,c}));assert(html.includes('80%'));assert(html.includes('40%'));assert(html.includes('10%'));assert(html.includes('法書'));
 let checked=0;for(const [id,item] of Object.entries(e.DATA.items)){const info=safety.enhancementSafety(id,item);if(!info)continue;const ch=make();ch.bag={[id]:1,scroll_weapon:10,scroll_armor:10,scroll_acc:10};ch.enh={};try{const actual=gear.enhancementInfo(ch,id);assert(info.canEnhance,id);assert.equal(info.safe,Number.isFinite(actual.safe)?Math.max(0,actual.safe):0,id);assert.equal(info.cap,actual.cap,id);}catch(error){if(error.code==='ERR_ASSERTION')throw error;assert(!info.canEnhance,id+': '+error.message);}checked++;}
 const Safe=component('enhancement-safety').default;
 for(const safe of [0,4,6]){const item={type:'wpn',source:'lineagew',lwCatalogId:'test',lwGrade:'rare',safe};const h=renderToStaticMarkup(React.createElement(Safe,{id:'test',item,en:safe}));assert(h.includes('安定值：+'));assert(h.includes(String(safe)));assert(h.includes(String(safe+1)));assert(h.includes('無上限'));}
 console.log('PASS: three independent dragon rolls and 1–8/1–5/1–2 quantities; all families; weapons/armor/rings/belts/books; actual award once; preview SSR; '+checked+' equipment safety rules match server');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
