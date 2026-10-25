const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const root=require('node:path').resolve(__dirname,'..'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
async function scenario(conflicts,mutate=false,invalid=false,pending=false){
 let row={payload:JSON.stringify({characters:[],gold:10,at:1000}),revision:0},writes=0,reads=0,commits=0;
 const DB={prepare(sql){return {bind(...args){return {async first(){reads++;return {...row};},async run(){if(!sql.startsWith('UPDATE'))throw Error('unexpected SQL');writes++;if(writes<=conflicts){row={payload:JSON.stringify({characters:[],gold:40+writes,at:1000}),revision:row.revision+1};return {meta:{changes:0}};}assert.equal(args[3],row.revision);row={payload:args[0],revision:row.revision+1};commits++;return {meta:{changes:1}};}};}};}};
 const mocks={...require('./route-migration-mocks.cjs'),'../../../lib/game/equipment381-migration-store':{ensureEquipment381Migration:async(db,owner,row)=>row},
 '../../../lib/game/state-sync':require('../lib/game/state-sync.ts'),
 'cloudflare:workers':{env:{DB}},'../../chatgpt-auth':{getChatGPTUser:async()=>({userId:'test'})},
 '../../../lib/game/game-settings':{getGameSettings:async()=>({npcs:{revision:0,hidden:{},shops:{},history:[]},mapAccess:{revision:0,closed:{},changes:{}},appearance:{revision:0,items:{},defaults:{},history:[]},maps:{maps:{},bosses:{}},monsters:{definitions:{},bossDrops:{}},dolls:{definitions:{}},world:{}})},
 '../../../lib/game/login-mode':{GAME_PASSWORD_LOGIN_ENABLED:false},'../../../lib/game/account':{},'../../../lib/game/inventory':{},
 '../../../lib/game/world-store':{isGameMaster:()=>false},'../../../lib/game/world-rules':{worldRulesAt:()=>({})},
 '../../../lib/game/engine':{advance:s=>{s.at=2000;return {pendingSeconds:pending?1000:0};},action:s=>{if(invalid)throw Error('invalid action');s.gold-=5;},stats:()=>({}),emptySave:()=>({characters:[]})}
 };
 const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(root+'/app/api/game/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:n=>{assert.ok(n in mocks,n);return mocks[n];},Response,Request,Date,Math,console,setTimeout,performance,URL});
 const req=new Request('https://game.test/api/game',{method:mutate?'POST':'GET',...(mutate?{body:'{}'}:{})});
 const res=await module.exports[mutate?'POST':'GET'](req),data=await res.json();
 if(invalid){assert.equal(res.status,400);assert.equal(writes,0);return;}
 if(conflicts>0&&!mutate){assert.equal(res.status,200);assert.equal(writes,1);assert.equal(reads,2);assert.equal(commits,0);assert.equal(data.save.gold,41);assert.deepEqual(data.save,JSON.parse(row.payload));return;}
 if(conflicts>=4){assert.equal(res.status,409);assert.equal(writes,4);assert.equal(commits,0);return;}
 if(pending&&mutate){assert.equal(res.status,409);assert.equal(commits,1);assert.equal(data.save.at,2000);assert.equal(data.save.gold,conflicts?40+conflicts:10);assert.equal(data.report.pendingSeconds,1000);return;}
 assert.equal(res.status,200);assert.equal(writes,conflicts+1);assert.equal(commits,1);assert.equal(reads,conflicts+1);assert.equal(data.save.gold,(conflicts?40+conflicts:10)-(mutate?5:0));assert.deepEqual(JSON.parse(row.payload),data.save);
}
async function connectionChecks(){
 const timeoutDurations=[];const trackedTimeout=(fn,ms)=>{timeoutDurations.push(ms);return setTimeout(fn,ms);};
 const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(root+'/lib/game/game-connection.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,fetch,AbortController,DOMException,setTimeout:trackedTimeout,clearTimeout,Promise,Error,URLSearchParams});
 let calls=0;const fake=async()=>Response.json(++calls===1?{error:'conflict'}:{save:{}},{status:calls===1?409:200});
 assert.equal((await module.exports.fetchGameState(undefined,fake)).res.status,200);assert.equal(calls,2);assert.deepEqual(timeoutDurations,[30000,650,30000],'reads use 30-second timeouts and a 650ms conflict backoff');timeoutDurations.length=0;
 calls=0;assert.equal((await module.exports.fetchGameState({type:'buy'},fake)).res.status,409);assert.equal(calls,1);assert.deepEqual(timeoutDurations,[8000],'actions retain a bounded timeout and are never replayed');
 const interrupted=new AbortController();let retryCalls=0;const blocked=module.exports.fetchGameState(undefined,async()=>{retryCalls++;return Response.json({},{status:409});},30000,undefined,interrupted.signal);const rejected=assert.rejects(blocked,e=>e.name==='AbortError');await new Promise(resolve=>setImmediate(resolve));interrupted.abort();await rejected;assert.equal(retryCalls,1,'aborting backoff must not retry the stale read');
 calls=0;await assert.rejects(module.exports.fetchGameState({type:'buy'},async()=>{calls++;throw Error('lost response');}));assert.equal(calls,1);
}
(async()=>{for(const mutate of [false,true])for(const conflicts of [0,1,3,8])await scenario(conflicts,mutate);await scenario(0,true,true);await scenario(1,true,false,true);await connectionChecks();console.log('PASS: reads and actions recover from conflicts using latest save; bounded contention; invalid actions never write.');})().catch(e=>{console.error(e);process.exitCode=1;});

