import {getMapPoolConfig} from '../../../lib/game/map-pool-store';
import {mapGeneration,mapPool,type MapPoolConfig} from '../../../lib/game/map-pools';
import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { isGameMaster, getWorldConfig } from '../../../lib/game/world-store';
import { validateWorldChange } from '../../../lib/game/world-rules';
import { DATA } from '../../../lib/game/engine';
export const dynamic='force-dynamic';
function maps(config:any,pools:MapPoolConfig){return Object.entries(DATA.maps).map(([id,mobs])=>{const g=mapGeneration(id,pools.maps),entries=mapPool(id,pools.maps);return {id,name:Object.values(DATA.mapCategories).flat().find(x=>x.v===id)?.t||id,baseCount:mobs.length,count:entries.length?g.count:0,respawnMs:g.respawnSeconds*1000,mobs:entries.map(e=>({id:e.id,name:DATA.mobs[e.id]?.n||e.id,count:e.weight}))};});}
export async function GET(){const user=await getChatGPTUser();if(!user)return Response.json({error:'請先登入'},{status:401});if(!isGameMaster(user))return Response.json({error:'此帳號沒有 GM 權限'},{status:403});try{const config=await getWorldConfig();return Response.json({config,maps:maps(config,await getMapPoolConfig())},{headers:{'Cache-Control':'no-store'}});}catch(e){console.error('GM settings unavailable',e);return Response.json({error:'目前無法讀取世界設定，請稍後重試'},{status:503});}}
export async function POST(request:Request){const user=await getChatGPTUser();if(!user)return Response.json({error:'請先登入'},{status:401});if(!isGameMaster(user))return Response.json({error:'此帳號沒有 GM 權限'},{status:403});const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'來源不符'},{status:403});
 try{const input:any=await request.json();const rules=validateWorldChange(input);if(!Number.isInteger(input.revision))throw new Error('請重新載入設定');const previous=await getWorldConfig();if(input.revision!==previous.revision)return Response.json({error:'設定已被更新，請重新載入後再儲存'},{status:409});const now=Date.now();const config={...rules,revision:previous.revision+1,updatedAt:now,history:[...previous.history,{...rules,at:now,by:user.userId}]};
 const result=await env.DB!.prepare('UPDATE world_settings SET payload=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?').bind(JSON.stringify(config),now,'world',input.revision).run();if(!result.meta.changes)return Response.json({error:'設定已被更新，請重新載入後再儲存'},{status:409});return Response.json({config,maps:maps(config,await getMapPoolConfig())},{headers:{'Cache-Control':'no-store'}});
 }catch(e){const message=e instanceof Error?e.message:'設定更新失敗';if(/storage|D1|SQLITE|table/i.test(message)){console.error('GM settings save failed',e);return Response.json({error:'設定未儲存，請稍後重試'},{status:503});}return Response.json({error:message},{status:400});}
}
