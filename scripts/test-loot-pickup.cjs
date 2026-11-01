const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'loot-pickup-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
try{
 for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,resolveJsonModule:true}}).outputText);}
 const p=require(path.join(dir,'loot-pickup.js'));
 const n=(item,rarity,quantity=1)=>({item,name:item,quantity,rarity,style:{},layout:'boss',slots:1});
 // Same item merges; order is commons first, rarest last.
 let list=p.planBossBurst([n('a','mythic'),n('b','normal',2),n('b','normal',3),n('c','rare')]);
 assert.deepEqual(list.map(x=>[x.item,x.quantity]),[['b',5],['c',1],['a',1]]);
 // Over the cap: the commonest collapse into one "+N" chip, rarest stay.
 const many=Array.from({length:15},(_,i)=>n('i'+i,i<10?'normal':'legend'));list=p.planBossBurst(many,12);
 assert.equal(list.length,12);assert.equal(list[0].extra,4);assert.ok(list.slice(-5).every(x=>x.rarity==='legend'));
 // Only the top tier is a slow finale, and only when it is rare or better.
 const plan=p.burstSchedule(p.planBossBurst([n('x','normal'),n('y','hero'),n('z','hero')]));
 assert.deepEqual(plan.map(s=>s.finale),[false,true,true]);assert.ok(plan[2].start-plan[1].start>=1000);
 assert.ok(p.burstSchedule(p.planBossBurst([n('x','normal'),n('y','advanced')])).every(s=>!s.finale));
 // Ring and ground spots stay inside the scene.
 for(const aspect of [.6,.75,1.6])for(const pt of p.burstPositions({x:70,y:58},12,aspect))assert.ok(pt.x>=8&&pt.x<=92&&pt.y>=22&&pt.y<=90);
 for(let i=0;i<8;i++){const g=p.groundSpot({x:90,y:88},i);assert.ok(g.x>=6&&g.x<=94&&g.y>=20&&g.y<=92);}
 assert.equal(p.lootIconSrc('scroll_armor'),'/assets/icons/items/對盔甲施法的卷軸.png');
 assert.equal(p.lootIconSrc('scroll_armor@x'),p.lootIconSrc('scroll_armor'));
 assert.deepEqual(p.lootOrigin({layout:'ordinary',spawnPoint:{x:52,y:82},slots:3},1),{x:52,y:82});
 console.log('PASS loot pickup: merge/order/cap, finale timing, positions in bounds, icon and origin lookup');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
