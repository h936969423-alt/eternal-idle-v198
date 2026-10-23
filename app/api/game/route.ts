import {ensureLineageWMythicMigration} from '@/lib/game/lineagew-mythic-migration-store';
import {ensureControlRingRestoration} from '@/lib/game/control-ring-restoration-store';
import {ensureLineageWHLMigration} from '@/lib/game/lineagew-hl-migration-store';
import {ensureLineageWMigration} from '@/lib/game/lineagew-migration-store';
import {ensureEquipment381Migration} from '../../../lib/game/equipment381-migration-store';
import {getGameSettings} from '../../../lib/game/game-settings';
import {GAME_PASSWORD_LOGIN_ENABLED} from '../../../lib/game/login-mode';
import {gameAccount} from '../../../lib/game/account';
import {persistedSave,responseSave,type GameSyncCursor} from '../../../lib/game/state-sync';
import { isGameMaster } from '../../../lib/game/world-store';
import { worldRulesAt, type WorldConfig } from '../../../lib/game/world-rules';
import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { action, advance, emptySave, stats, xpNeed, populationSummary, syncPopulation, ensureArena, type Save } from '../../../lib/game/engine';
export const dynamic='force-dynamic';
function view(s:Save,report:any,world:WorldConfig,gm:boolean,settingsKey:string,cursor?:GameSyncCursor){const now=s.at;const rules=worldRulesAt(world,now);const populations=Object.fromEntries(s.characters.map(c=>[c.id,populationSummary(c,now,rules)]));return {serverTime:Date.now(),...responseSave(s,settingsKey,cursor),derived:Object.fromEntries(s.characters.map(c=>[c.id,{...stats(c),xpNeed:xpNeed(c.lv)}])),report,populations,world:{...rules,updatedAt:world.updatedAt},gm};}
async function handle(request:Request,mutate:boolean){
 const started=performance.now(),timings:Record<string,number>={};
 const user=await getChatGPTUser();timings.auth=performance.now()-started;if(!user)return Response.json({error:'請先登入以載入遊戲進度'},{status:401});
 if(mutate){const origin=request.headers.get('origin');if(origin&&new URL(request.url).origin!==origin)return Response.json({error:'來源不符'},{status:403});}
 try{
  if(!env.DB)throw new Error('save storage unavailable');
  if(GAME_PASSWORD_LOGIN_ENABLED&&!await gameAccount(user.userId))return Response.json({error:'請登入遊戲帳號'},{status:401});
  const owner=user.userId;
  const payload=mutate?await request.json():null;
  const readAt=performance.now();
  const [existing,settings]=await Promise.all([env.DB.prepare('SELECT payload,revision FROM game_saves WHERE owner=?').bind(owner).first<{payload:string;revision:number}>(),getGameSettings()]);
  timings.read=performance.now()-readAt;
  const settingsKey=['lineagew-mythic-v1-controls1',settings.maps.revision,settings.monsters.revision,settings.dolls.revision,settings.world.revision,settings.appearance.revision,settings.mapAccess.revision,settings.npcs.revision].map(n=>n||0).join(':');
  const query=new URL(request.url).searchParams,after=Number(query.get('after'));
  const cursor:GameSyncCursor|undefined=!mutate&&query.has('after')&&Number.isSafeInteger(after)&&after>=0?{character:query.get('character')||'',after,settingsKey:query.get('settings')||''}:undefined;
  const reply=(data:any,status=200)=>{const encodeAt=performance.now(),body=JSON.stringify(data);timings.encode=performance.now()-encodeAt;timings.total=performance.now()-started;if(timings.total>=300)console.info('game-timing',JSON.stringify({method:request.method,status,...timings,chars:body.length}));return new Response(body,{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Server-Timing':Object.entries(timings).map(([key,ms])=>`${key};dur=${ms.toFixed(1)}`).join(', ')}});};
  // Retry only a confirmed failed compare-and-swap. Each attempt starts from
  // the latest committed save, so discarded combat/actions cannot overwrite it.
  for(let attempt=0;attempt<4;attempt++){
  let row=attempt===0?existing:await env.DB.prepare('SELECT payload,revision FROM game_saves WHERE owner=?').bind(owner).first<{payload:string;revision:number}>();
  if(!row){const initial=emptySave();await env.DB.prepare('INSERT INTO game_saves (owner,payload,revision,updated_at) VALUES (?,?,0,?) ON CONFLICT(owner) DO NOTHING').bind(owner,JSON.stringify(initial),Date.now()).run();row=await env.DB.prepare('SELECT payload,revision FROM game_saves WHERE owner=?').bind(owner).first<{payload:string;revision:number}>();}
  if(!row)throw Error('save not found');
  row=await ensureEquipment381Migration(env.DB,owner,row);
 row=await ensureLineageWMigration(env.DB,owner,row);
 row=await ensureLineageWHLMigration(env.DB,owner,row);
 row=await ensureControlRingRestoration(env.DB,owner,row);
 row=await ensureLineageWMythicMigration(env.DB,owner,row);
  const simulationAt=performance.now();
  const save=JSON.parse(row.payload) as Save,{maps:mapConfig,monsters,dolls,world}=settings;const requestedAt=Date.now();for(const c of save.characters){c.npcConfig={...settings.npcs,history:[]};c.mapAccess=settings.mapAccess;c.lootAppearance={...settings.appearance,history:[]};c.dollDefinitions=dolls.definitions;c.mapPools=mapConfig.maps;c.bossGeneration=mapConfig.bosses;c.monsterDefinitions=monsters.definitions;c.bossDropDefinitions=monsters.bossDrops;}const report=advance(save,requestedAt,Math.random,world);const now=save.at;
  for(const c of save.characters){syncPopulation(c,worldRulesAt(world,now));ensureArena(c,Math.random,now);}
  for(const c of save.characters){c.npcConfig={...settings.npcs,history:[]};c.mapAccess=settings.mapAccess;c.lootAppearance={...settings.appearance,history:[]};c.dollDefinitions=dolls.definitions;c.mapPools=mapConfig.maps;c.bossGeneration=mapConfig.bosses;c.monsterDefinitions=monsters.definitions;c.bossDropDefinitions=monsters.bossDrops;const b=stats(c,now);c.hp=Math.min(c.hp,b.maxHp);c.mp=Math.min(c.mp,b.maxMp);}if(payload&&!report.pendingSeconds)action(save,payload,now);for(const c of save.characters){c.npcConfig={...settings.npcs,history:[]};c.mapAccess=settings.mapAccess;c.lootAppearance={...settings.appearance,history:[]};c.dollDefinitions=dolls.definitions;c.mapPools=mapConfig.maps;c.bossGeneration=mapConfig.bosses;c.monsterDefinitions=monsters.definitions;c.bossDropDefinitions=monsters.bossDrops;}
  for(const c of save.characters){syncPopulation(c,worldRulesAt(world,now));ensureArena(c,Math.random,now);}
  timings.simulation=(timings.simulation||0)+performance.now()-simulationAt;
  const encodeAt=performance.now(),stored=JSON.stringify(persistedSave(save));timings.persistEncode=(timings.persistEncode||0)+performance.now()-encodeAt;const writeAt=performance.now();
  const result=await env.DB.prepare('UPDATE game_saves SET payload=?,revision=revision+1,updated_at=? WHERE owner=? AND revision=?').bind(stored,now,owner,row.revision).run();
  timings.write=(timings.write||0)+performance.now()-writeAt;
  if(!result.meta.changes){
   if(mutate)continue;
   // A competing window already committed this tick. Read its authoritative
   // result instead of repeatedly simulating and fighting for the same save.
   const committed=await env.DB.prepare('SELECT payload,revision FROM game_saves WHERE owner=?').bind(owner).first<{payload:string;revision:number}>();
   if(!committed)continue;
   const current=JSON.parse(committed.payload) as Save;
   for(const c of current.characters){c.npcConfig={...settings.npcs,history:[]};c.mapAccess=settings.mapAccess;c.lootAppearance={...settings.appearance,history:[]};c.dollDefinitions=dolls.definitions;c.mapPools=mapConfig.maps;c.bossGeneration=mapConfig.bosses;c.monsterDefinitions=monsters.definitions;c.bossDropDefinitions=monsters.bossDrops;}
   const currentReport={seconds:0,kills:0,gold:0,pendingSeconds:current.catchup?Math.max(0,Math.ceil((requestedAt-current.at)/1000)):0,offline:false};
   return reply(view(current,currentReport,world,isGameMaster(user),settingsKey,cursor));
  }
  const viewAt=performance.now();const response=view(save,report,world,isGameMaster(user),settingsKey,cursor);timings.view=performance.now()-viewAt;
  if(payload&&report.pendingSeconds)return reply({...response,error:'離線進度正在結算，完成後請再操作'},409);
  return reply(response);
  }
  return Response.json({error:'進度同步繁忙，請稍後重試'},{status:409,headers:{'Cache-Control':'no-store'}});
 }catch(e){const msg=e instanceof Error?e.message:'未知錯誤';const storage=/storage|table|database|D1|SQLITE|save not found/i.test(msg);if(storage)console.error('game save failed',e);return Response.json({error:storage?'暫時無法讀取存檔，請稍後重試；你的進度未被覆寫。':msg},{status:storage?503:400});}
}
export const GET=(r:Request)=>handle(r,false);
export const POST=(r:Request)=>handle(r,true);
