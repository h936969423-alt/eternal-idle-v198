/** Bound the entire fetch + JSON operation. Retry reads only; never replay a game action. */
import type {GameSyncCursor} from './state-sync';
export async function fetchGameState(action?:unknown,fetcher:typeof fetch=fetch,timeoutMs=action===undefined?30000:8000,cursor?:GameSyncCursor,signal?:AbortSignal):Promise<{res:Response;data:any}>{
 const aborted=()=>new DOMException('背景同步已讓位給操作','AbortError');
 const backoff=()=>new Promise<void>((resolve,reject)=>{
  if(signal?.aborted){reject(aborted());return;}
  const cancel=()=>{clearTimeout(timer);signal?.removeEventListener('abort',cancel);reject(aborted());};
  const timer=setTimeout(()=>{signal?.removeEventListener('abort',cancel);resolve();},650);
  signal?.addEventListener('abort',cancel,{once:true});
 });
 if(signal?.aborted)throw aborted();
 const attempts=action===undefined?2:1;
 for(let attempt=0;attempt<attempts;attempt++){
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
  let rejectAbort:((reason:unknown)=>void)|undefined;const cancel=()=>{controller.abort();rejectAbort?.(aborted());};signal?.addEventListener('abort',cancel,{once:true});
  try{
   if(signal?.aborted)throw aborted();
   const query=action===undefined&&cursor?'?'+new URLSearchParams({character:cursor.character,after:String(cursor.after),settings:cursor.settingsKey}).toString():'';
   const operation=fetcher('/api/game'+query,{method:action===undefined?'GET':'POST',headers:action===undefined?undefined:{'Content-Type':'application/json'},body:action===undefined?undefined:JSON.stringify(action),cache:'no-store',signal:controller.signal}).then(async res=>{const body=await res.text();let data:any;try{data=JSON.parse(body);}catch{throw new Error(`伺服器回應異常（HTTP ${res.status}；非 JSON）`);}return {res,data};});
   const result=await Promise.race([operation,new Promise<never>((_,reject)=>{rejectAbort=reject;if(signal?.aborted)reject(aborted());}),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('連線逾時'));},timeoutMs);})]);
   if(action===undefined&&(result.res.status===409||result.res.status>=500)&&attempt+1<attempts){await backoff();continue;}
   return result;
  }catch(e){if(signal?.aborted)throw aborted();if(attempt+1<attempts){await backoff();continue;}throw new Error(action===undefined?`連線中斷：${e instanceof Error?e.message:'未知網路錯誤'}。正在重新連線…`:'連線中斷，操作結果尚待確認；畫面恢復後請先確認結果，避免重複操作。');}
  finally{signal?.removeEventListener('abort',cancel);if(timer!==undefined)clearTimeout(timer);}
 }
 throw new Error('連線暫時中斷，正在重新連線…');
}

