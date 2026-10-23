import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {isGameMaster} from '../../../../lib/game/world-store';
import {getNpcConfig} from '../../../../lib/game/npc-config-store';
import {updateNpcConfig} from '../../../../lib/game/npc-config';
export const dynamic='force-dynamic';
export async function GET(){const user=await getChatGPTUser();if(!isGameMaster(user))return Response.json({error:'此帳號沒有 GM 權限'},{status:403});try{return Response.json(await getNpcConfig(),{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'無法讀取 NPC 與商人設定'},{status:503});}}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user||!isGameMaster(user))return Response.json({error:'此帳號沒有 GM 權限'},{status:403});if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'來源不符'},{status:403});
 try{const input=await request.json() as any,old=await getNpcConfig();if(input.revision!==old.revision)return Response.json({error:'設定已更新，請重新載入後再操作'},{status:409});const now=Date.now(),config=updateNpcConfig(old,input,user.userId,now);const result=await env.DB!.prepare('UPDATE world_settings SET payload=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?').bind(JSON.stringify(config),now,'npcs',old.revision).run();if(!result.meta.changes)return Response.json({error:'設定已更新，請重新載入後再操作'},{status:409});return Response.json(config,{headers:{'Cache-Control':'no-store'}});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'設定未儲存'},{status:400});}
}
