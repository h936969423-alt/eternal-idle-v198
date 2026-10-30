const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'game-api-errors-'));
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
fs.writeFileSync(path.join(dir,'api-errors.cjs'),compile(fs.readFileSync(path.join(root,'lib/game/api-errors.ts'),'utf8')));
const errors=require(path.join(dir,'api-errors.cjs')),routeSource=compile(fs.readFileSync(path.join(root,'app/api/game/route.ts'),'utf8'));
function fixture(fault=''){
 let payload=JSON.stringify({v:1,characters:[],active:null,at:Date.now(),count:0}),revision=0,writes=0,actions=0;
 const DB={prepare(sql){let args=[];return {bind(...values){args=values;return this;},async first(){if(fault==='read')throw Error('D1 database unavailable');return {payload,revision};},async run(){writes++;if(fault==='write')throw Error('D1 connection lost after dispatch');payload=args[0];revision++;return {meta:{changes:1}};}};}};
 const settings={maps:{revision:1,maps:{},bosses:{}},monsters:{revision:1,definitions:{},bossDrops:{}},dolls:{revision:1,definitions:{}},world:{revision:1},appearance:{revision:1},mapAccess:{revision:1},npcs:{revision:1}};
 const engine={emptySave:()=>({}),advance:()=>{if(fault==='simulation')throw new TypeError('private simulation details');return {seconds:0,kills:0,gold:0,pendingSeconds:0};},action:(save)=>{actions++;if(fault==='business')throw Error('金幣不足');if(fault==='action')throw new TypeError('private broken action details');save.count++;},stats:()=>({}),xpNeed:()=>0,populationSummary:()=>({}),syncPopulation:()=>{},ensureArena:()=>{}};
 const requireMock=name=>{
  if(name.endsWith('api-errors'))return errors;
  if(name==='cloudflare:workers')return {env:{DB}};
  if(name.endsWith('chatgpt-auth'))return {getChatGPTUser:async()=>{if(fault==='auth')throw Error('D1 session lookup failed');return fault==='anonymous'?null:{userId:'private-owner'};}};
  if(name.endsWith('game-settings'))return {getGameSettings:async()=>settings};
  if(name.endsWith('world-store'))return {isGameMaster:()=>false};
  if(name.endsWith('world-rules'))return {worldRulesAt:()=>({})};
  if(name.endsWith('skill-cooldown'))return {isSkillCooldownFailure:()=>false};
  if(name.endsWith('engine'))return engine;
  if(name.endsWith('state-sync'))return {persistedSave:s=>s,responseSave:s=>{if(fault==='view')throw new TypeError('private view failure');return {save:s};}};
  if(/migration-store$|restoration-store$/.test(name))return new Proxy({},{get:()=>async(db,owner,row)=>{if(fault==='migration')throw new TypeError('private migration failure');return row;}});
  throw Error('Unexpected import '+name);
 };
 const mod={exports:{}};new Function('require','module','exports',routeSource)(requireMock,mod,mod.exports);
 return {...mod.exports,get writes(){return writes;},get actions(){return actions;},get saved(){return JSON.parse(payload);}};
}
const request=(body={type:'buy',requestId:'stable-operation-id'})=>new Request('https://test.local/api/game',{method:'POST',headers:{'Content-Type':'application/json','Cookie':'private-cookie'},body:typeof body==='string'?body:JSON.stringify(body)});
async function main(){
 const logs=[],oldError=console.error,oldWarn=console.warn;console.error=console.warn=(...args)=>logs.push(args);
 try{
  for(const [fault,status,phase]of [['auth',503,'auth'],['read',503,'read'],['migration',500,'migration'],['simulation',500,'simulation'],['action',500,'action'],['business',400,'action'],['write',503,'write'],['view',500,'view']]){
   const f=fixture(fault),res=await f.POST(request()),data=await res.json();assert.equal(res.status,status,fault);assert.match(res.headers.get('Content-Type'),/application\/json/);assert.equal(res.headers.get('Cache-Control'),'no-store');assert.equal(res.headers.get('X-Request-ID'),data.requestId);assert(data.requestId);assert.equal(logs.at(-1)[0].phase,phase);assert(logs.at(-1)[0].stack);assert(!JSON.stringify(data).includes('private'));
   if(['write','view'].includes(fault)){assert.equal(data.outcome,'unconfirmed');assert.match(data.error,/結果尚待確認/);assert.equal(f.actions,1);assert.equal(f.writes,1);if(fault==='view')assert.equal(f.saved.count,1,'post-commit response failure cannot claim no changes');}
   else{assert.equal(data.outcome,'not_committed');assert.equal(f.writes,0,'failure cannot overwrite a save');}
  }
  for(const body of ['{','null','[]','{}','{"type":1}']){const f=fixture(),res=await f.POST(request(body));assert.equal(res.status,400);assert((await res.json()).error);assert.equal(f.writes,0);}
  const f=fixture();let res=await f.POST(request({type:'buy',data:'x'.repeat(70000)}));assert.equal(res.status,413);assert.equal(f.writes,0);
  res=await f.POST(new Request('https://test.local/api/game',{method:'POST',headers:{origin:'https://elsewhere.test'},body:'{}'}));assert.equal(res.status,403);assert.equal(f.writes,0);
  assert.equal((await fixture('anonymous').GET(new Request('https://test.local/api/game'))).status,401);
  const success=fixture();res=await success.POST(request());assert.equal(res.status,200);assert.equal((await res.json()).save.count,1);res=await success.POST(request());assert.equal(res.status,200);assert.equal((await res.json()).save.count,1);assert.equal(success.actions,1,'same confirmed mutation ID is not applied twice');assert.equal(success.writes,1);
  for(const method of ['GET','POST']){res=await errors.protectGameApi(new Request('https://test.local/api/game',{method}),async()=>{throw new TypeError('framework failure');});assert.equal(res.status,500);const data=await res.json();assert.equal(data.outcome,method==='POST'?'unconfirmed':'not_committed');assert(data.requestId);}
  res=await errors.protectGameApi(new Request('https://test.local/api/game'),async()=>new Response('<html>edge</html>',{status:503,headers:{'Content-Type':'text/html'}}));assert.equal(res.status,500);assert((await res.json()).requestId);
  const untouched=new Response('<html>page</html>',{status:500});assert.equal(await errors.protectGameApi(new Request('https://test.local/'),async()=>untouched),untouched,'boundary is scoped to the game API');
  const dump=JSON.stringify(logs);assert(!dump.includes('private-cookie')&&!dump.includes('private-owner')&&!dump.includes('stable-operation-id'),'no request bodies, account identifiers or cookies in diagnostics');
 }finally{console.error=oldError;console.warn=oldWarn;}
 console.log('PASS: auth/read/migration/simulation/action/write/view failures return traceable JSON; malformed and oversized bodies, origin/auth gates, unknown/confirmed writes, deduplicated mutations and framework non-JSON failures verified.');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>fs.rmSync(dir,{recursive:true,force:true}));
