import {ensureLineageWMythicMigration} from '@/lib/game/lineagew-mythic-migration-store';
import {ensureControlRingRestoration} from '@/lib/game/control-ring-restoration-store';
import {ensureLineageWHLMigration} from '@/lib/game/lineagew-hl-migration-store';
import {ensureLineageWMigration} from '@/lib/game/lineagew-migration-store';
import {ensureEquipment381Migration} from '../../../../lib/game/equipment381-migration-store';
import {getGameSettings} from '../../../../lib/game/game-settings';
import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../../chatgpt-auth';
import { isGameMaster } from '../../../../lib/game/world-store';
import {persistedSave} from '../../../../lib/game/state-sync';
import { advance, syncPopulation, type Save } from '../../../../lib/game/engine';
import { validateGrant, applyGrant } from '../../../../lib/game/gm-grants';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
async function state(owner:string){
 const row=await env.DB!.prepare('SELECT payload FROM game_saves WHERE owner=?').bind(owner).first<{payload:string}>();
 const save:Save|null=row?JSON.parse(row.payload):null;
 const receipts=await env.DB!.prepare('SELECT message,created_at AS at FROM gm_grant_receipts WHERE owner=? ORDER BY created_at DESC,rowid DESC LIMIT 20').bind(owner).all();
 return {characters:save?.characters.map(c=>({id:c.id,name:c.name,lv:c.lv,gold:c.gold,points:c.points}))||[],active:save?.active||null,history:receipts.results};
}
export async function GET(){const user=await getChatGPTUser();if(!user)return Response.json({error:'請先登入'},{status:401});if(!isGameMaster(user))return Response.json({error:'此帳號沒有 GM 權限'},{status:403});try{return Response.json(await state(user.userId),{headers});}catch(e){console.error('GM character read failed',e);return Response.json({error:'目前無法讀取角色，請稍後重試'},{status:503});}}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return Response.json({error:'請先登入'},{status:401});if(!isGameMaster(user))return Response.json({error:'此帳號沒有 GM 權限'},{status:403});
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'來源不符'},{status:403});
 try{
 const input:any=await request.json();const grant=validateGrant(input);
 if(typeof input.requestId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId))throw new Error('操作編號無效，請重新載入');
 const id=`${user.userId}:${input.requestId.toLowerCase()}`,command=JSON.stringify(grant);
 const receipt=await env.DB!.prepare('SELECT command,message FROM gm_grant_receipts WHERE id=?').bind(id).first<{command:string;message:string}>();
 if(receipt){if(receipt.command!==command)return Response.json({error:'操作編號已使用，請重新操作'},{status:409});return Response.json({...await state(user.userId),message:receipt.message,deduplicated:true},{headers});}
 const {maps:mapConfig,monsters,dolls,world,appearance,mapAccess}=await getGameSettings();
 // Load settings before taking a save revision; retry only rejected atomic writes.
 for(let attempt=0;attempt<4;attempt++){
 let row=await env.DB!.prepare('SELECT payload,revision FROM game_saves WHERE owner=?').bind(user.userId).first<{payload:string;revision:number}>();if(!row)throw new Error('請先在遊戲建立角色');
 row=await ensureEquipment381Migration(env.DB!,user.userId,row);
 row=await ensureLineageWMigration(env.DB!,user.userId,row);
 row=await ensureLineageWHLMigration(env.DB!,user.userId,row);
 row=await ensureControlRingRestoration(env.DB!,user.userId,row);
 row=await ensureLineageWMythicMigration(env.DB!,user.userId,row);
 const now=Date.now(),save:Save=JSON.parse(row.payload);if(save.catchup||now-save.at>120000)return Response.json({error:'正在同步離線進度，完成後會繼續發放',code:'progress_pending'},{status:409,headers});for(const c of save.characters){c.mapAccess=mapAccess;c.lootAppearance={...appearance,history:[]};c.dollDefinitions=dolls.definitions;c.mapPools=mapConfig.maps;c.bossGeneration=mapConfig.bosses;c.monsterDefinitions=monsters.definitions;c.bossDropDefinitions=monsters.bossDrops;}advance(save,now,Math.random,world);
 const message=applyGrant(save,grant,now);for(const c of save.characters)syncPopulation(c,world);
 const results=await env.DB!.batch([
 env.DB!.prepare('UPDATE game_saves SET payload=?,revision=revision+1,updated_at=? WHERE owner=? AND revision=? AND NOT EXISTS (SELECT 1 FROM gm_grant_receipts WHERE id=?)').bind(JSON.stringify(persistedSave(save)),now,user.userId,row.revision,id),
 env.DB!.prepare('INSERT INTO gm_grant_receipts (id,owner,character_id,command,message,created_at) SELECT ?,?,?,?,?,? WHERE changes()=1').bind(id,user.userId,grant.characterId,command,message,now)
 ]);
 if(!results[0].meta.changes){const repeated=await env.DB!.prepare('SELECT command,message FROM gm_grant_receipts WHERE id=?').bind(id).first<{command:string;message:string}>();if(repeated&&repeated.command===command)return Response.json({...await state(user.userId),message:repeated.message,deduplicated:true},{headers});continue;}
 return Response.json({...await state(user.userId),message},{headers});
 }
 return Response.json({error:'角色更新頻繁，請稍後重試',code:'save_conflict'},{status:409,headers});
 }catch(e){const message=e instanceof Error?e.message:'操作失敗';if(/storage|D1|SQLITE|table/i.test(message)){console.error('GM grant failed',e);return Response.json({error:'操作暫時無法完成，請稍後重試'},{status:503});}return Response.json({error:message},{status:400});}
}
