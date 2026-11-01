// A pet/summon finishing blow must not overtake the player's earlier normal hit on the same monster,
// or the monster falls before the arrow leaves, the swing retargets and one arrow shows numbers on two
// monsters. Other events and other monsters are not held, and the hold is bounded.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'kill-order-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
try{
 for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
 const P=require(path.join(dir,'combat-presentation.js'));
 const hit=(seq,uid,extra={})=>({seq,at:0,due:0,kind:'attack',uid,slot:uid==='A'?0:1,damage:10,mobHp:5,...extra});
 const kinds=list=>list.map(e=>`${e.seq}:${e.source||'player'}`);
 // 1. Player hit on A waits for its swing contact; the pet's kill on A waits behind it.
 let queue=[hit(1,'A'),hit(2,'A',{source:'pet',mobHp:0,damage:5})],pending=[],contact=false;
 const allow=()=>contact;
 let shown=P.drainCombatPresentation(queue,pending,100,false,undefined,allow);
 assert.deepEqual(kinds(shown),[],'pet kill held while the player hit waits for its swing');
 shown=P.drainCombatPresentation(queue,pending,600,false,undefined,allow);
 assert.deepEqual(kinds(shown),[],'still held before contact');
 contact=true;
 shown=[...P.drainCombatPresentation(queue,pending,700,false,undefined,allow),...P.drainCombatPresentation(queue,pending,720,false,undefined,allow)];
 assert.deepEqual(kinds(shown),['1:player','2:pet'],'player hit first, then the pet kill');
 // 2. Bow: the launched arrow's impact is pending; the kill waits for the impact too.
 queue=[hit(1,'A'),hit(2,'A',{source:'summon',mobHp:0})];pending=[];
 shown=P.drainCombatPresentation(queue,pending,100,true,undefined,()=>true);
 assert.deepEqual(shown.map(e=>e.visualPhase||e.source),['launch'],'arrow launched, summon kill waits');
 const late=100+P.KILL_ORDER_HOLD_MS-200;
 shown=[...P.drainCombatPresentation(queue,pending,late,true,undefined,()=>true),...P.drainCombatPresentation(queue,pending,late+20,true,undefined,()=>true)];
 assert.deepEqual(shown.map(e=>`${e.seq}:${e.visualPhase||e.source}`),['1:impact','2:summon'],'impact then summon kill (next frame)');
 // 3. Non-lethal pet hits and kills on other monsters are not held.
 queue=[hit(1,'A'),hit(2,'A',{source:'pet',mobHp:3}),hit(3,'B',{source:'pet',mobHp:0})];pending=[];
 shown=P.drainCombatPresentation(queue,pending,100,false,undefined,()=>false);
 assert.deepEqual(kinds(shown),['2:pet','3:pet'],'only a kill on the waiting monster is held');
 // 4. Bounded: a swing that never comes cannot hold the kill forever.
 queue=[hit(1,'A'),hit(2,'A',{source:'pet',mobHp:0})];pending=[];
 P.drainCombatPresentation(queue,pending,100,false,undefined,()=>false);
 shown=P.drainCombatPresentation(queue,pending,100+P.KILL_ORDER_HOLD_MS+20,false,undefined,()=>false);
 assert.deepEqual(kinds(shown),['2:pet'],'released after KILL_ORDER_HOLD_MS');
 console.log(`PASS companion kill order: kill waits for the player's earlier hit (contact and arrow impact), others not held, released after ${P.KILL_ORDER_HOLD_MS}ms`);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
