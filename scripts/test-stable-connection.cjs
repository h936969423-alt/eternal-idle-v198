const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function timers(){let id=0;const jobs=new Map();return {jobs,set(fn,delay){jobs.set(++id,{fn,delay});return id;},clear(n){jobs.delete(n);},fire(delay){const entry=[...jobs].find(([,x])=>x.delay===delay);assert.ok(entry,`missing timer ${delay}`);jobs.delete(entry[0]);entry[1].fn();}};}
function load(file,t,mocks={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:n=>mocks[n],Response,AbortController,DOMException,URLSearchParams,fetch,performance,setTimeout:t.set.bind(t),clearTimeout:t.clear.bind(t)});return module.exports;}
const flush=async()=>{for(let i=0;i<15;i++)await Promise.resolve();};
function surface(){const listeners=new Map();return {visibilityState:'visible',addEventListener(k,f){if(!listeners.has(k))listeners.set(k,new Set());listeners.get(k).add(f);},removeEventListener(k,f){listeners.get(k)?.delete(f);},emit(k){for(const f of listeners.get(k)||[])f();},listeners};}
async function run(){
 let t=timers(),c=load('lib/game/game-connection.ts',t),calls=0;
 let outcome=c.fetchGameState({type:'buy'},()=>{calls++;return new Promise(()=>{});},8000).then(()=>null,e=>e);
 await flush();t.fire(8000);await flush();assert.match((await outcome).message,/結果尚待確認/);assert.equal(calls,1);assert.equal(t.jobs.size,0,'failed mutation is never retried');
 t=timers();c=load('lib/game/game-connection.ts',t);const ctrl=new AbortController();calls=0;
 outcome=c.fetchGameState(undefined,async()=>{calls++;return Response.json({error:'busy'},{status:503});},8000,undefined,ctrl.signal).then(()=>null,e=>e);
 await flush();assert.equal(t.jobs.size,1);assert.equal([...t.jobs.values()][0].delay,650,'attempt timeout is cleared before backoff');ctrl.abort();await flush();assert.equal((await outcome).name,'AbortError');assert.equal(calls,1);assert.equal(t.jobs.size,0,'cancelled retry delay releases all timers');
 t=timers();c=load('lib/game/game-connection.ts',t);
 outcome=c.fetchRecoveryState(async()=>({ok:true,status:200,text:()=>new Promise(()=>{})})).then(()=>null,e=>e);await flush();t.fire(8000);await flush();assert.match((await outcome).message,/逾時/);assert.equal(t.jobs.size,0,'recovery response body is bounded');
 t=timers();c=load('lib/game/game-connection.ts',t);const abort=new AbortController();
 outcome=c.fetchRecoveryState(()=>new Promise(()=>{}),abort.signal).then(()=>null,e=>e);await flush();abort.abort();await flush();assert.equal((await outcome).name,'AbortError');assert.equal(t.jobs.size,0);
 t=timers();c=load('lib/game/game-connection.ts',t);calls=0;
 outcome=c.fetchGameState(undefined,async()=>{calls++;return Response.json(calls===1?{error:'busy'}:{save:{characters:[]}},{status:calls===1?503:200});},8000);await flush();t.fire(650);await flush();assert.equal((await outcome).res.status,200);assert.equal(calls,2);assert.equal(t.jobs.size,0);
 t=timers();c=load('lib/game/game-connection.ts',t);calls=0;
 outcome=c.fetchGameState(undefined,async()=>{calls++;return Response.json({error:'expired'},{status:401});});await flush();assert.equal((await outcome).res.status,401);assert.equal(calls,1,'expired session does not retry forever');
 // Entering a character transfers a full snapshot and must not use the 8s action timeout.
 t=timers();c=load('lib/game/game-connection.ts',t);calls=0;let complete;
 outcome=c.fetchGameState({type:'select',id:'hero'},(url,init)=>{calls++;assert.match(url,/character=hero/);assert.match(url,/settings=known/);assert.equal(init.method,'POST');return new Promise(resolve=>{complete=()=>resolve(Response.json({save:{active:'hero',characters:[]}}));});},undefined,{character:'hero',after:10,settingsKey:'known'});
 await flush();assert.equal([...t.jobs.values()][0].delay,30000);complete();await flush();assert.equal((await outcome).data.save.active,'hero');assert.equal(calls,1);assert.equal(t.jobs.size,0);
 const doc=surface(),win=surface();t=timers();let pendingResolve,count=0,aborts=0,concurrent=0,maxConcurrent=0;
 const poll=load('lib/game/client-poll.ts',t,{'./sync-policy':{nextSyncDelay:()=>3000}});
 const stop=poll.startGamePolling({doc,win,getState:()=>({running:true,failures:0,pending:false}),hasPending:()=>false,abortRead:()=>{aborts++;pendingResolve?.();},request:async()=>{count++;concurrent++;maxConcurrent=Math.max(maxConcurrent,concurrent);if(count===1)await new Promise(resolve=>{pendingResolve=resolve;});concurrent--;},schedule:t.set.bind(t),cancel:t.clear.bind(t)});
 await flush();assert.equal(count,1);win.emit('pageshow');win.emit('focus');doc.emit('visibilitychange');await flush();assert.equal(aborts,1,'wake burst cancels one stale read');assert.equal(count,1);t.fire(0);await flush();assert.equal(count,2);assert.equal(maxConcurrent,1);assert.equal(t.jobs.size,1);
 win.emit('offline');assert.equal(t.jobs.size,0);win.emit('focus');await flush();assert.equal(count,2,'offline does not hammer server');win.emit('online');await flush();assert.equal(count,3,'network restoration immediately refreshes');assert.equal(t.jobs.size,1);
 doc.visibilityState='hidden';doc.emit('visibilitychange');assert.equal(t.jobs.size,0);doc.visibilityState='visible';doc.emit('visibilitychange');await flush();assert.equal(count,4);stop();assert.equal(t.jobs.size,0);for(const set of [...doc.listeners.values(),...win.listeners.values()])assert.equal(set.size,0);win.emit('online');await flush();assert.equal(count,4);
 console.log('PASS: wake coalescing, stale-read cancellation, offline/online recovery, background pause, cleanup, bounded recovery body, abortable retry, no mutation replay, 401 handling.');
}
run().catch(e=>{console.error(e);process.exitCode=1;});

