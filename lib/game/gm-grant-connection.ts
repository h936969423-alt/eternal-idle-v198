import {fetchGameState} from './game-connection';
/** Keep one request ID through catchup, contention and a lost response. */
export async function sendGmGrant(payload:Record<string,unknown>,onProgress:(message:string)=>void=()=>{},fetcher:typeof fetch=fetch){
 const body=JSON.stringify(payload);
 for(let attempt=0;attempt<4;attempt++){
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
  let result:{res:Response;data:any};
  try{
   const operation=fetcher('/api/gm/characters',{method:'POST',headers:{'Content-Type':'application/json'},body,signal:controller.signal}).then(async res=>({res,data:await res.json()}));
   result=await Promise.race([operation,new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('發放連線逾時'));},30000);})]);
  }catch(e){if(attempt<3)continue;throw Error('連線中斷，請更新角色操作紀錄，確認是否已發放。');}
  finally{if(timer!==undefined)clearTimeout(timer);}
  const {res,data}=result;
  if(res.ok)return data;
  if(res.status===409&&data.code==='progress_pending'&&attempt<3){
   onProgress('正在同步角色與離線收益，完成後繼續發放…');
   let ready=false;
   for(let batch=0;batch<40;batch++){
    const current=await fetchGameState(undefined,fetcher);
    if(!current.res.ok)throw Error(current.data.error||'無法同步角色進度');
    if(!current.data.save)throw Error('尚未載入角色存檔');
    const pending=current.data.report?.pendingSeconds||0;
    if(!pending){ready=true;break;}
    onProgress(`正在結算離線收益，尚餘約 ${Math.ceil(pending/60)} 分鐘的進度…`);
   }
   if(!ready)throw Error('離線進度尚未完成，請稍後重試');
   continue;
  }
  if(attempt<3&&(res.status===503||res.status===409&&data.code==='save_conflict'))continue;
  throw Error(data.error||'發放失敗');
 }
 throw Error('無法完成發放，請稍後重試');
}
