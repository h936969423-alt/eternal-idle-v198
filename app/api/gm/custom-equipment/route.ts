import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {isGameMaster} from '../../../../lib/game/world-store';
import {loadCustomEquipment} from '../../../../lib/game/custom-equipment-store';
import {applyCustomEquipment,validateCustomEquipment} from '../../../../lib/game/custom-equipment';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
export async function GET(){const user=await getChatGPTUser();if(!isGameMaster(user))return Response.json({error:'此帳號沒有 GM 權限'},{status:403});try{return Response.json(await loadCustomEquipment(),{headers});}catch{return Response.json({error:'目前無法讀取自訂裝備'},{status:503});}}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user||!isGameMaster(user))return Response.json({error:'此帳號沒有 GM 權限'},{status:403});
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'來源不符'},{status:403});
 try{
  const input:any=await request.json(),old=await loadCustomEquipment();
  if(input.revision!==old.revision)return Response.json({error:'設定已被更新，請重新載入後再儲存'},{status:409});
  const items={...old.items};let nextId=old.nextId||1,id=String(input.id||'');
  if(input.action==='create'){id=`gmx_${nextId++}`;items[id]=validateCustomEquipment(input.item,id);}
  else{const current=Object.hasOwn(items,id)?items[id]:undefined;if(!current)throw Error('找不到這件裝備');
   if(input.action==='update'){if(current.deleted)throw Error('此裝備已刪除');items[id]=validateCustomEquipment(input.item,id);}
   else if(input.action==='delete')items[id]={...current,deleted:true};
   else throw Error('操作無效');}
  const at=Date.now(),{revision:_,...rest}=old,config={...rest,items,nextId,history:[...(old.history||[]),{at,by:user.userId,action:input.action,id,name:items[id].name}].slice(-30)};
  const result=await env.DB!.prepare('UPDATE world_settings SET payload=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?').bind(JSON.stringify(config),at,'custom_equipment',old.revision).run();
  if(!result.meta.changes)return Response.json({error:'設定已被更新，請重新載入後再儲存'},{status:409});
  applyCustomEquipment(config);return Response.json({...config,revision:old.revision+1},{headers});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'設定未儲存'},{status:400});}
}
