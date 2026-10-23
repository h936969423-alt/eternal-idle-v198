/** Bound the entire fetch + JSON operation. Retry reads only; never replay a game action. */
import type {GameSyncCursor} from './state-sync';
export async function fetchGameState(action?:unknown,fetcher:typeof fetch=fetch,timeoutMs=action===undefined?30000:8000,cursor?:GameSyncCursor,signal?:AbortSignal):Promise<{res:Response;data:any}>{
 const aborted=()=>new DOMException('背景同步已讓位給操作','AbortError');
 if(signal?.aborted)throw aborted();
 const attempts=action===undefined?2:1;
 for(let attempt=0;attempt<attempts;attempt++){
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
  let rejectAbort:((reason:unknown)=>void)|undefined;const cancel=()=>{controller.abort();rejectAbort?.(aborted());};signal?.addEventListener('abort',cancel,{once:true});
  try{
   if(signal?.aborted)throw aborted();
   const query=action===undefined&&cursor?'?'+new URLSearchParams({character:cursor.character,after:String(cursor.after),settings:cursor.settingsKey}).toString():'';
   const operation=fetcher('/api/game'+query,{method:action===undefined?'GET':'POST',headers:action===undefined?undefined:{'Content-Type':'application/json'},body:action===undefined?undefined:JSON.stringify(action),cache:'no-store',signal:controller.signal}).then(async res=>({res,data:await res.json()}));
   const result=await Promise.race([operation,new Promise<never>((_,reject)=>{rejectAbort=reject;if(signal?.aborted)reject(aborted());}),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('連線逾時'));},timeoutMs);})]);
   if(action===undefined&&(result.res.status===409||result.res.status>=500)&&attempt+1<attempts)continue;
   return result;
  }catch(e){if(signal?.aborted)throw aborted();if(attempt+1<attempts)continue;throw new Error(action===undefined?'連線暫時中斷，正在重新連線…':'連線中斷，操作結果尚待確認；畫面恢復後請先確認結果，避免重複操作。');}
  finally{signal?.removeEventListener('abort',cancel);if(timer!==undefined)clearTimeout(timer);}
 }
 throw new Error('連線暫時中斷，正在重新連線…');
}
