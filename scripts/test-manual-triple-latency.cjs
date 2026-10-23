const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const {fetchGameState}=require('../lib/game/game-connection.ts'),{createRequestQueue}=require('../lib/game/request-queue.ts'),{manualReplayOffset}=require('../lib/game/replay-timing.ts'),{pushCue}=require('../lib/game/animation-clock.ts'),{playerCues}=require('../lib/game/animation-cues.ts');
(async()=>{
 const controller=new AbortController(),queue=createRequestQueue();let reads=0,actions=0,startedResolve;const started=new Promise(r=>startedResolve=r);
 const read=queue.run(()=>fetchGameState(undefined,async()=>{reads++;startedResolve();return new Promise(()=>{});},30000,undefined,controller.signal));
 await started;const rejected=assert.rejects(read,e=>e.name==='AbortError');controller.abort();
 const action=queue.run(()=>fetchGameState({type:'cast',skill:'sk_elf_triple'},async()=>{actions++;return new Response(JSON.stringify({ok:true}),{status:200});},1000),true);
 const result=await Promise.race([action,new Promise((_,reject)=>setTimeout(()=>reject(Error('manual action waited behind stalled poll')),1000))]);assert.ok(result.data.ok);await rejected;assert.equal(reads,1,'aborted poll never retries');assert.equal(actions,1,'manual action runs once');
 const rejectedController=new AbortController();rejectedController.abort();await assert.rejects(fetchGameState(undefined,async()=>{throw Error('must not start');},1000,undefined,rejectedController.signal),e=>e.name==='AbortError');
 const events=[{seq:1,at:1000,kind:'attack',skill:'sk_elf_triple',manual:true},{seq:2,at:1070,kind:'attack',skill:'sk_elf_triple',manual:true},{seq:3,at:1140,kind:'attack',skill:'sk_elf_triple',manual:true},{seq:4,at:1000,kind:'magic',skill:'sk_elf_triple',manual:true}];
 const offset=manualReplayOffset([{at:0},...events],5000);assert.deepEqual(events.slice(0,3).map(e=>e.at+offset),[5000,5070,5140]);
 const cue=playerCues(events)[0];assert.equal(cue.immediate,true);assert.equal(cue.durationMs,70);
 for(const kind of ['attack','skill','hurt']){const motion=pushCue({kind,at:0,duration:3000,pending:[{seq:0,at:0,kind:'attack'}]},cue,100,()=>3000);assert.equal(motion.at,100);assert.equal(motion.duration,70);assert.deepEqual(motion.pending,[]);}
 assert.equal(pushCue({kind:'death',at:0,duration:3000,pending:[]},cue,100,()=>3000).kind,'death');
 console.log('PASS: stalled poll yields promptly, no read retry/stale result, one mutation, immediate confirmed manual animation, 70ms triple burst, 70ms hit spacing, death priority.');
})().catch(e=>{console.error(e);process.exitCode=1;});

const {enqueueCombatReplay}=require('../lib/game/combat-presentation.ts');
const {combatArrowFlight}=require('../lib/game/player-sprite-layout.ts');
const attack=(seq,at,manual=false)=>({seq,at,kind:'attack',skill:'sk_elf_triple',manual,hp:100,mp:50,slot:0,uid:'mob',damage:20,mobHp:500-seq*20});
const burst=[attack(10,1000),attack(11,1070),attack(12,1140),{seq:13,at:1000,kind:'magic',skill:'sk_elf_triple',hp:100,mp:50}];
for(const arrival of [1200,2000,5000]){
 const old=[{seq:1,at:0,kind:'state',hp:100,mp:65,due:arrival+650}];
 const playback=enqueueCombatReplay(old,burst,arrival,arrival+650);
 const hits=playback.queue.filter(e=>e.kind==='attack');
 assert.deepEqual(hits.map(e=>e.due),[arrival,arrival+70,arrival+140],'confirmed auto burst bypasses 650ms buffer and old backlog');
 assert.equal(playback.queue[0].seq,1,'historical state is applied before new damage');
 assert.deepEqual(hits.map(e=>e.mobHp),[300,280,260],'the same events drive damage and HP');
}
const batch=[...burst,...burst.map(e=>({...e,seq:e.seq+10,at:e.at+1000}))];
const latest=enqueueCombatReplay([],batch,5000,null).queue.filter(e=>e.kind==='attack'&&e.seq>=20);assert.deepEqual(latest.map(e=>e.due),[5000,5070,5140],'latest burst does not wait for an older burst');
const killed=enqueueCombatReplay([],[attack(1,1000),{seq:2,at:1000,kind:'magic',skill:'sk_elf_triple',hp:100,mp:50}],2000,null);assert.equal(killed.queue[0].due,2000,'lethal first arrow is immediate');
const miss=enqueueCombatReplay([],burst.map(e=>e.kind==='attack'?{...e,miss:true,damage:0}:e),2000,null);assert.deepEqual(miss.queue.filter(e=>e.kind==='attack').map(e=>e.due),[2000,2070,2140]);
const manual=enqueueCombatReplay([],[...burst,{seq:14,at:1300,kind:'magic',skill:'sk_b2s',manual:true,hp:80,mp:80}],3000,null);assert.equal(manual.queue.find(e=>e.manual).due,3000,'manual recovery retains priority');
const flight=combatArrowFlight({x:0,y:0},{x:500,y:300},1.5,'sk_elf_triple');assert.equal(flight.delay,0);assert.equal(flight.duration,200);
assert.equal(combatArrowFlight({x:0,y:0},{x:500,y:300},1.5).delay,0,'ordinary bow releases immediately for synchronized impact');
console.log('PASS: automatic/manual triple damage bypasses buffered history, latest burst and lethal/missed shots preserve 70ms cadence, arrow launch has no extra wait.');

const initial=enqueueCombatReplay([],burst,2000,null);
const nextPoll=enqueueCombatReplay(initial.queue.filter(e=>e.due>2000),[{seq:14,at:1040,kind:'state',hp:100,mp:50}],2040,initial.offset);
assert.deepEqual(nextPoll.queue.filter(e=>e.kind==='attack').map(e=>e.due),[2070,2140],'a buff/state poll between arrows cannot reintroduce the jitter buffer');
