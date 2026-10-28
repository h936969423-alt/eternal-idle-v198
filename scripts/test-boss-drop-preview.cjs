const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync('/tmp/boss-drop-preview-');
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
for(const name of fs.readdirSync(path.join(root,'lib/game'))){const f=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(f,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
const load=n=>require(path.join(dir,n));
try{
 const raw=load('gamedata.json'),preview=load('boss-drop-preview').bossDropPreview,boss=load('boss-respawn'),hybrid=load('hybrid-loot'),rank=load('loot-appearance'),e=load('engine');
 const base=e.BASES.knight,allocation={};let left=base.pts;for(const k of ['str','dex','con','int','wis','cha']){allocation[k]=Math.min(left,20-base[k]);left-=allocation[k];}
 const c=e.createCharacter('掉落驗證','knight','m',allocation,1000000),staff='lw_equipment_908934';let found,checked=0;
 for(const zone of Object.keys(raw.worldBosses).filter(boss.playableBoss)){
  c.zone=zone;e.ensureArena(c,()=>.5,1000000);
  const room=c.bossRooms[zone],lv=Math.max(...room.arena.map(m=>raw.mobs[m.id].lv)),rule=hybrid.defaultHybridRule(lv,hybrid.hybridRoleForBoss(zone)),pool=hybrid.hybridCandidates(rule,room.arena[0].id,zone,lv,undefined,1000000),view=preview(zone,c,undefined,1000000);
  const shown=view.equipment.flatMap(g=>g.items.map(d=>d.item)).sort(),actual=Object.keys(pool).flatMap(r=>rule.weights[r]>0?pool[r]:[]).sort();assert.deepEqual(shown,actual,zone);
  assert(!view.drops.some(d=>hybrid.isProgressionEquipment(raw.items[d.item])),'fixed pool must not claim replaced equipment');
  if(shown.includes(staff))found={zone,rule,pool,view};
  checked++;
 }
 assert(found,'進化法杖 must be visible wherever actual default boss pools can roll it');
 const {zone,rule,pool}=found;const rarity=rank.itemRarity(staff),ranks=Object.keys(rule.weights),total=Object.values(rule.weights).reduce((a,b)=>a+b,0),before=ranks.slice(0,ranks.indexOf(rarity)).reduce((n,r)=>n+rule.weights[r],0),draws=[0,(before+rule.weights[rarity]/2)/total,(pool[rarity].indexOf(staff)+.5)/pool[rarity].length,.5,.5];
 assert(hybrid.rollHybridLoot(rule,pool,()=>draws.shift()??.5).drops.some(d=>d.item===staff),'actual loot roll returns the displayed staff');
 c.zone=zone;e.ensureArena(c,()=>.5,1000000);const member=c.bossRooms[zone].arena[0];
 const mod={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path.join(root,'app/map-monsters.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText)(key=>key.startsWith('@/lib/game/')?load(key.slice(11)):require(key),mod,mod.exports);
 const html=renderToStaticMarkup(React.createElement(mod.exports.MonsterDrops,{id:member.id,c}));
 assert(html.includes('混合裝備池'));assert(html.includes('進化法杖'));assert(html.includes('世界王整場掉落'));
 const custom={id:zone,timing:'complete',drops:[],hybrid:{...rule,pool:'custom',equipmentIds:[staff],weights:{normal:0,advanced:0,rare:0,hero:100,legend:0,mythic:0}}};
 c.bossRooms[zone].dropDefinition=custom;
 assert.deepEqual(preview(zone,c,undefined,1000000).equipment.flatMap(g=>g.items.map(d=>d.item)),[staff]);
 c.bossDropDefinitions={[zone]:{...custom,hybrid:undefined}};
 assert(preview(zone,c,undefined,1000000).equipment.length,'active room snapshot wins over edited future config');
 c.bossRooms[zone].dropDefinition={id:zone,timing:'complete',drops:[{item:staff,enabled:true,chance:2,min:1,max:1}]};
 const fixed=preview(zone,c,undefined,1000000);assert.equal(fixed.equipment.length,0);assert(fixed.drops.some(d=>d.item===staff&&d.chance===2));
 console.log('PASS: '+checked+' actual boss pools match preview; 進化法杖 actual roll and member-click SSR; custom pools, fixed drops and room snapshots');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
