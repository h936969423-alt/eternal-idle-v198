const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const compile=path=>ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const token='a'.repeat(64);
async function scenario({valid=true,present=true,cross=false}={}){
 let authReads=0,saveReads=0,writes=0,actions=0;const owner='verified-owner',settings={maps:{maps:{},bosses:{}},monsters:{definitions:{},bossDrops:{}},dolls:{definitions:{}},world:{},npcs:{},mapAccess:{},appearance:{}};
 const DB={prepare(sql){return {bind(...args){return {async first(){
  if(sql.startsWith('SELECT owner, username')){authReads++;assert.equal(args[0],'verified-token-hash');assert.ok(args[1]>0);return valid?{owner,username:'player'}:null;}
  assert.ok(sql.startsWith('SELECT payload,revision FROM game_saves'));saveReads++;assert.equal(args[0],owner);return {payload:JSON.stringify({at:1000,active:'',characters:[]}),revision:3};
 },async run(){assert.ok(sql.startsWith('UPDATE game_saves'));assert.equal(args[2],owner);assert.equal(args[3],3);writes++;return {meta:{changes:1}};}};}};}};
 const authMod={exports:{}};
 vm.runInNewContext(compile('app/chatgpt-auth.ts'),{exports:authMod.exports,require:id=>id==='next/headers'?{cookies:async()=>({get:()=>present?{value:token}:undefined})}:id==='cloudflare:workers'?{env:{DB}}:id==='@/lib/game/account'?{digest:async value=>{assert.equal(value,token);return 'verified-token-hash';}}:{redirect:()=>{}},Date});
 const mocks={'cloudflare:workers':{env:{DB}},'../../chatgpt-auth':authMod.exports,'../../../lib/game/state-sync':{persistedSave:s=>s,responseSave:s=>({save:s})},'../../../lib/game/game-settings':{getGameSettings:async()=>settings},'../../../lib/game/world-store':{isGameMaster:()=>false},'../../../lib/game/world-rules':{worldRulesAt:()=>({})},'../../../lib/game/engine':{advance:s=>({pendingSeconds:0}),action:(s,a)=>{assert.equal(a.type,'cast');actions++;},stats:()=>({}),emptySave:()=>({characters:[]})}};
 for(const [path,fn]of [['../../../lib/game/equipment381-migration-store','ensureEquipment381Migration'],['@/lib/game/lineagew-migration-store','ensureLineageWMigration'],['@/lib/game/lineagew-hl-migration-store','ensureLineageWHLMigration'],['@/lib/game/control-ring-restoration-store','ensureControlRingRestoration'],['@/lib/game/lineagew-mythic-migration-store','ensureLineageWMythicMigration']])mocks[path]={[fn]:async(db,owner,row)=>row};
 const mod={exports:{}};vm.runInNewContext(compile('app/api/game/route.ts'),{exports:mod.exports,require:id=>{assert.ok(mocks[id],'unexpected dependency '+id);return mocks[id];},performance,Date,Math,JSON,Response,URL,console});
 const res=await mod.exports.POST(new Request('https://game.test/api/game',{method:'POST',headers:{Origin:cross?'https://untrusted.test':'https://game.test','Content-Type':'application/json','oai-authenticated-user-id':owner},body:JSON.stringify({type:'cast',skill:'sk_meteor'})}));
 assert.equal(authReads,present?1:0,'session token and expiry are checked once in D1, with no redundant account query');
 if(!present||!valid){assert.equal(res.status,401);assert.equal(saveReads,0);assert.equal(writes,0);assert.equal(actions,0);}
 else if(cross){assert.equal(res.status,403);assert.equal(saveReads,0);assert.equal(writes,0);}
 else{assert.equal(res.status,200);assert.equal(saveReads,1);assert.equal(writes,1);assert.equal(actions,1);assert.match(res.headers.get('Server-Timing'),/auth;dur=/);}
}
(async()=>{await scenario();await scenario({valid:false});await scenario({present:false});await scenario({cross:true});console.log('PASS: actual session authentication validates token/expiry once; revoked sessions, missing cookies/forged identity headers and cross-origin casts cannot access/write saves; valid cast commits once to the authenticated owner.');})().catch(e=>{console.error(e);process.exitCode=1;});
