import {parsedSave} from '../../../lib/game/parsed-save';
import {apiContext,apiHeaders,apiErrorResponse,ApiInputError,readGameAction} from '../../../lib/game/api-errors';
import {ensureSkillIdMigration} from '@/lib/game/skill-id-migration-store';
import {isSkillCooldownFailure} from '@/lib/game/skill-cooldown';
import {ensureLineageWMythicMigration} from '@/lib/game/lineagew-mythic-migration-store';
import {ensureControlRingRestoration} from '@/lib/game/control-ring-restoration-store';
import {ensureLineageWHLMigration} from '@/lib/game/lineagew-hl-migration-store';
import {ensureLineageWMigration} from '@/lib/game/lineagew-migration-store';
import {ensureEquipment381Migration} from '../../../lib/game/equipment381-migration-store';
import {getGameSettings} from '../../../lib/game/game-settings';
import {persistedSave,responseSave,type GameSyncCursor} from '../../../lib/game/state-sync';
import { isGameMaster } from '../../../lib/game/world-store';
import { worldRulesAt, type WorldConfig } from '../../../lib/game/world-rules';
import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { action, advance, emptySave, stats, xpNeed, populationSummary, syncPopulation, ensureArena, type Save } from '../../../lib/game/engine';
export const dynamic='force-dynamic';
function view(s:Save,report:any,world:WorldConfig,gm:boolean,settingsKey:string,cursor?:GameSyncCursor){const now=s.at;const rules=worldRulesAt(world,now);if(report.pendingSeconds>0&&s.catchup?.mode!=='online')return {serverTime:Date.now(),...responseSave(s,settingsKey,cursor),derived:{},report,populations:{},world:{...rules,updatedAt:world.updatedAt},gm};const populations=Object.fromEntries(s.characters.map(c=>[c.id,populationSummary(c,now,rules)]));return {serverTime:Date.now(),...responseSave(s,settingsKey,cursor),derived:Object.fromEntries(s.characters.map(c=>[c.id,{...stats(c),xpNeed:xpNeed(c.lv)}])),report,populations,world:{...rules,updatedAt:world.updatedAt},gm};}
async function handle(request:Request,mutate:boolean){
 const context=apiContext(request),started=context.started,timings:Record<string,number>={};
 try{
 const user=await getChatGPTUser();timings.auth=performance.now()-started;if(!user)return Response.json({error:'請先登入以載入遊戲進度'},{status:401,headers:apiHeaders(context)});
 if(mutate){const origin=request.headers.get('origin');if(origin&&new URL(request.url).origin!==origin)throw new ApiInputError('來源不符',403);}
  if(!env.DB)throw new Error('save storage unavailable');
  // getChatGPTUser already validates this exact session hash and expiry in D1.
  // Repeating gameAccount here added another serial database round trip.
  const owner=user.userId;
  // Read-only recovery endpoint. Never runs the combat engine or writes D1.
  // Enables the client to verify a save exists even when offline simulation
  // exceeds the Worker CPU limit. Do not expose private owner identifiers.
  const requestUrl=new URL(request.url);context.phase='recovery';
  if(!mutate&&requestUrl.searchParams.get('mode')==='recovery'){
   const row=await env.DB.prepare('SELECT payload,revision FROM game_saves WHERE owner=?').bind(owner).first<{payload:string;revision:number}>();
   if(!row)return Response.json({available:false,pending:false,characters:[]},{headers:apiHeaders(context)});
   const stored=parsedSave(row) as Save;
   return Response.json({available:true,pending:!!stored.catchup||Date.now()-stored.at>30000,characters:stored.characters.map(c=>({id:c.id,name:c.name,level:c.lv,running:c.running})),active:stored.active,settledAt:stored.at,remainingSeconds:stored.catchup?.targetAt?Math.max(0,Math.ceil((stored.catchup.targetAt-stored.at)/1000)):null},{headers:apiHeaders(context)});
  }
  context.phase='request';const payload=mutate?await readGameAction(request):null;context.operation=payload?.type||'poll';
  context.phase='read';
  const readAt=performance.now();
  const [existing,settings]=await Promise.all([env.DB.prepare('SELECT payload,revision FROM game_saves WHERE owner=?').bind(owner).first<{payload:string;revision:number}>(),getGameSettings()]);
  timings.read=performance.now()-readAt;
  const settingsKey=['canonical-skills-v1',settings.maps.revision,settings.monsters.revision,settings.dolls.revision,settings.world.revision,settings.appearance.revision,settings.mapAccess.revision,settings.npcs.revision].map(n=>n||0).join(':');
  const query=new URL(request.url).searchParams,after=Number(query.get('after'));
  const cursor:GameSyncCursor|undefined=query.has('after')&&Number.isSafeInteger(after)&&after>=0?{character:query.get('character')||'',after,settingsKey:query.get('settings')||''}:undefined;
  const reply=(data:any,status=200)=>{const encodeAt=performance.now(),body=JSON.stringify(data);timings.encode=performance.now()-encodeAt;timings.total=performance.now()-started;if(timings.total>=300)console.info('game-timing',JSON.stringify({requestId:context.requestId,operation:context.operation,method:request.method,status,...timings,chars:body.length}));return new Response(body,{status,headers:{...apiHeaders(context),'Content-Type':'application/json','Server-Timing':Object.entries(timings).map(([key,ms])=>`${key};dur=${ms.toFixed(1)}`).join(', ')}});};
  // Retry only a confirmed failed compare-and-swap. Each attempt starts from
  // the latest committed save, so discarded combat/actions cannot overwrite it.
  for(let attempt=0;attempt<4;attempt++){context.phase='read';context.commit='none';
  let row=attempt===0?existing:await env.DB.prepare('SELECT payload,revision FROM game_saves WHERE owner=?').bind(owner).first<{payload:string;revision:number}>();
  if(!row){const initial=emptySave();await env.DB.prepare('INSERT INTO game_saves (owner,payload,revision,updated_at) VALUES (?,?,0,?) ON CONFLICT(owner) DO NOTHING').bind(owner,JSON.stringify(initial),Date.now()).run();row=await env.DB.prepare('SELECT payload,revision FROM game_saves WHERE owner=?').bind(owner).first<{payload:string;revision:number}>();}
  if(!row)throw Error('save not found');
  context.phase='migration';
  row=await ensureEquipment381Migration(env.DB,owner,row);
 row=await ensureLineageWMigration(env.DB,owner,row);
 row=await ensureLineageWHLMigration(env.DB,owner,row);
 row=await ensureControlRingRestoration(env.DB,owner,row);
 row=await ensureLineageWMythicMigration(env.DB,owner,row);
 row=await ensureSkillIdMigration(env.DB,owner,row);
  // Return the authoritative committed save for a retried mutation, without applying it twice.
  const mutationId=payload&&typeof payload==='object'&&'requestId' in payload?payload.requestId:undefined;
  const requestId=mutate&&typeof mutationId==='string'&&mutationId.length<=128?mutationId:null;
  const prior=parsedSave(row) as Save & {processedActions?:string[]};
  if(requestId&&prior.processedActions?.includes(requestId)){
   const {maps,monsters,dolls,world}=settings;
   for(const c of prior.characters){c.npcConfig={...settings.npcs,history:[]};c.mapAccess=settings.mapAccess;c.lootAppearance={...settings.appearance,history:[]};c.dollDefinitions=dolls.definitions;c.mapPools=maps.maps;c.bossGeneration=maps.bosses;c.monsterDefinitions=monsters.definitions;c.bossDropDefinitions=monsters.bossDrops;}
   context.phase='view';return reply(view(prior,{seconds:0,kills:0,gold:0,xp:0,drops:{},pendingSeconds:0,offline:false},world,isGameMaster(user),settingsKey,cursor));
  }
  let actionError:string|undefined;
  context.phase='simulation';const simulationAt=performance.now();
  const save=parsedSave(row) as Save,{maps:mapConfig,monsters,dolls,world}=settings;const requestedAt=Date.now();for(const c of save.characters){c.npcConfig={...settings.npcs,history:[]};c.mapAccess=settings.mapAccess;c.lootAppearance={...settings.appearance,history:[]};c.dollDefinitions=dolls.definitions;c.mapPools=mapConfig.maps;c.bossGeneration=mapConfig.bosses;c.monsterDefinitions=monsters.definitions;c.bossDropDefinitions=monsters.bossDrops;}const report=advance(save,requestedAt,Math.random,world,200,12);const now=save.at;
  if(!report.pendingSeconds)for(const c of save.characters){syncPopulation(c,worldRulesAt(world,now));ensureArena(c,Math.random,now);}
  for(const c of save.characters){c.npcConfig={...settings.npcs,history:[]};c.mapAccess=settings.mapAccess;c.lootAppearance={...settings.appearance,history:[]};c.dollDefinitions=dolls.definitions;c.mapPools=mapConfig.maps;c.bossGeneration=mapConfig.bosses;c.monsterDefinitions=monsters.definitions;c.bossDropDefinitions=monsters.bossDrops;if(!report.pendingSeconds){const b=stats(c,now);c.hp=Math.min(c.hp,b.maxHp);c.mp=Math.min(c.mp,b.maxMp);}}if(payload&&!report.pendingSeconds){context.phase='action';try{action(save,payload,now);}catch(error){if((payload as {type?:unknown}).type!=='cast'||!isSkillCooldownFailure(error))throw error;actionError=error.message;}}for(const c of save.characters){c.npcConfig={...settings.npcs,history:[]};c.mapAccess=settings.mapAccess;c.lootAppearance={...settings.appearance,history:[]};c.dollDefinitions=dolls.definitions;c.mapPools=mapConfig.maps;c.bossGeneration=mapConfig.bosses;c.monsterDefinitions=monsters.definitions;c.bossDropDefinitions=monsters.bossDrops;}
  if(!report.pendingSeconds)for(const c of save.characters){syncPopulation(c,worldRulesAt(world,now));ensureArena(c,Math.random,now);}
  timings.simulation=(timings.simulation||0)+performance.now()-simulationAt;
  if(requestId&&!report.pendingSeconds){const tracked=save as Save & {processedActions?:string[]};tracked.processedActions=[...(tracked.processedActions||[]).filter(id=>id!==requestId),requestId].slice(-128);}
  context.phase='serialize-save';const encodeAt=performance.now(),stored=JSON.stringify(persistedSave(save,cursor,now));timings.persistEncode=(timings.persistEncode||0)+performance.now()-encodeAt;const writeAt=performance.now();
  context.phase='write';context.commit='unknown';
  const result=await env.DB.prepare('UPDATE game_saves SET payload=?,revision=revision+1,updated_at=? WHERE owner=? AND revision=?').bind(stored,now,owner,row.revision).run();
  timings.write=(timings.write||0)+performance.now()-writeAt;
  if(!result.meta.changes){context.commit='none';context.phase='read-conflict';
   if(mutate)continue;
   // A competing window already committed this tick. Read its authoritative
   // result instead of repeatedly simulating and fighting for the same save.
   const committed=await env.DB.prepare('SELECT payload,revision FROM game_saves WHERE owner=?').bind(owner).first<{payload:string;revision:number}>();
   if(!committed)continue;
   const current=JSON.parse(committed.payload) as Save;
   for(const c of current.characters){c.npcConfig={...settings.npcs,history:[]};c.mapAccess=settings.mapAccess;c.lootAppearance={...settings.appearance,history:[]};c.dollDefinitions=dolls.definitions;c.mapPools=mapConfig.maps;c.bossGeneration=mapConfig.bosses;c.monsterDefinitions=monsters.definitions;c.bossDropDefinitions=monsters.bossDrops;}
   const currentReport={seconds:0,kills:0,gold:0,pendingSeconds:current.catchup?Math.max(0,Math.ceil(((current.catchup.targetAt??requestedAt)-current.at)/1000)):0,offline:false};
   context.phase='view';return reply(view(current,currentReport,world,isGameMaster(user),settingsKey,cursor));
  }
  context.commit='confirmed';context.phase='view';const viewAt=performance.now();const response=view(save,report,world,isGameMaster(user),settingsKey,cursor);timings.view=performance.now()-viewAt;
  if(payload&&report.pendingSeconds)return reply({...response,error:'離線進度正在結算，完成後請再操作'},409);
  return reply(actionError?{...response,error:actionError}:response,actionError?400:200);
  }
  return Response.json({error:'進度同步繁忙，請稍後重試'},{status:409,headers:{'Cache-Control':'no-store'}});
 }catch(error){return apiErrorResponse(request,error,context);}
}
export const GET=(r:Request)=>handle(r,false);
export const POST=(r:Request)=>handle(r,true);





