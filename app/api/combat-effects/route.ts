import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {isGameMaster} from '@/lib/game/world-store';
import {getCombatEffects} from '@/lib/game/combat-effects-store';
import {validateCombatEffects} from '@/lib/game/imported-effects';
export const dynamic='force-dynamic';
export async function GET(){const user=await getChatGPTUser();if(!user)return Response.json({error:'請先登入'},{status:401});try{return Response.json(await getCombatEffects(),{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'特效設定暫時無法讀取'},{status:503});}}
export async function POST(request:Request){const user=await getChatGPTUser();if(!user||!isGameMaster(user))return Response.json({error:'此帳號沒有 GM 權限'},{status:403});const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'來源不符'},{status:403});try{
 const input=await request.json() as any,previous=await getCombatEffects();if(!Number.isInteger(input.revision)||input.revision!==previous.revision)return Response.json({error:'設定已更新，請重新載入'},{status:409});
 const at=Date.now(),config={...validateCombatEffects(input),revision:previous.revision+1,history:[...previous.history,{at,by:user.userId}].slice(-30)};
 const result=await env.DB!.prepare('UPDATE world_settings SET payload=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?').bind(JSON.stringify(config),at,'combat_effects',previous.revision).run();if(!result.meta.changes)return Response.json({error:'設定已更新，請重新載入'},{status:409});return Response.json(config,{headers:{'Cache-Control':'no-store'}});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'特效設定未儲存'},{status:400});}}
