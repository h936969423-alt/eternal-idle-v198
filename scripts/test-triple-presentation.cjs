// Triple Arrow presentation: an older event shown later never rolls HP/MP back (92→80→92), and a Triple
// Arrow volley does not force-settle other monsters' pending normal hits in one burst.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'triple-view-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
try{
 for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
 const P=require(path.join(dir,'combat-presentation.js')),L=require(path.join(dir,'combat-float-layout.js'));
 const arena=[{uid:'A',id:'x',hp:500,maxHp:500},{uid:'B',id:'x',hp:500,maxHp:500}];
 // 1. Newer triple event (mp 80) applied first, then an older normal hit (mp 92) arrives late.
 let v={hp:200,mp:92,target:0,arena:arena.map(m=>({...m})),floats:[]};
 v=P.applyCombatViewEvent(v,{seq:10,at:0,kind:'attack',skill:'lw_skill_450',slot:1,uid:'B',damage:20,mobHp:480,hp:200,mp:80,source:'physical'},100);
 assert.equal(v.mp,80);
 v=P.applyCombatViewEvent(v,{seq:7,at:0,kind:'attack',slot:0,uid:'A',damage:10,mobHp:490,hp:205,mp:92,source:'physical'},200);
 assert.equal(v.mp,80,'an older event never rolls MP back');assert.equal(v.hp,200,'nor HP');
 assert.equal(v.arena[0].hp,490,'the older hit still lands on its monster');
 v=P.applyCombatViewEvent(v,{seq:11,at:0,kind:'heal',hp:230,mp:81},300);
 assert.deepEqual([v.hp,v.mp],[230,81],'newer snapshots still update');
 // 2. A pending normal hit on A is not force-settled when a Triple Arrow on B is drained.
 const queue=[{seq:5,at:0,due:0,kind:'attack',slot:0,uid:'A',damage:9,mobHp:0,hp:200,mp:92,source:'physical'},{seq:6,at:0,due:0,kind:'attack',skill:'lw_skill_450',slot:1,uid:'B',damage:20,mobHp:480,hp:200,mp:80,source:'physical'}];
 let shown=[];for(let t=0;t<=1000;t+=50)shown.push(...P.drainCombatPresentation(queue,[],t,false,undefined,()=>false));
 assert.ok(!shown.some(e=>e.seq===5),'normal hit on A waits for its own swing (no forced burst)');
 assert.ok(shown.some(e=>e.seq===6),'triple arrow on B is shown');
 // 3. Float lanes: nine distinct positions, columns wide enough for three-digit numbers.
 const spots=new Set(Array.from({length:9},(_,n)=>JSON.stringify(L.combatFloatLayout(n))));
 assert.equal(spots.size,9,'nine distinct float positions');
 assert.ok(Math.abs(parseInt(L.combatFloatLayout(3).marginLeft)-parseInt(L.combatFloatLayout(0).marginLeft))>=30,'columns ≥30px apart');
 console.log('PASS triple presentation: no HP/MP rollback from late older events, no forced burst, 9 readable float spots');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
