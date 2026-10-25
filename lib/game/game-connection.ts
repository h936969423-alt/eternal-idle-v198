/** Bound the entire fetch + JSON operation. Retry reads only; never replay a game action. */
import type {GameSyncCursor} from './state-sync';
function abortError(){return new DOMException('同步已取消','AbortError');}
function retryDelay(signal?:AbortSignal){return new Promise<void>((resolve,reject)=>{
 if(signal?.aborted){reject(abortError());return;}
 const cancel=()=>{clearTimeout(timer);signal?.removeEventListener('abort',cancel);reject(abortError());};
 const timer=setTimeout(()=>{signal?.removeEventListener('abort',cancel);resolve();},650);
 signal?.addEventListener('abort',cancel,{once:true});
});}
/** Timeout covers response headers AND body parsing, including recovery reads. */
async function requestJson(url:string,init:RequestInit,fetcher:typeof fetch,timeoutMs:number,signal?:AbortSignal){
 if(signal?.aborted)throw abortError();
 const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
 let rejectAbort:((reason:unknown)=>void)|undefined;
 const cancel=()=>{controller.abort();rejectAbort?.(abortError());};
 signal?.addEventListener('abort',cancel,{once:true});
 try{
  const operation=fetcher(url,{...init,signal:controller.signal}).then(async res=>{
   const body=await res.text();let data:any;
   try{data=JSON.parse(body);}catch{throw Error(`伺服器回應異常（HTTP ${res.status}；非 JSON）`);}
   if(!data||typeof data!=='object'||Array.isArray(data))throw Error('伺服器回應格式錯誤');
   return {res,data};
  });
  return await Promise.race([operation,new Promise<never>((_,reject)=>{rejectAbort=reject;if(signal?.aborted)cancel();}),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('連線逾時'));},timeoutMs);})]);
 }finally{signal?.removeEventListener('abort',cancel);if(timer!==undefined)clearTimeout(timer);}
}
export async function fetchRecoveryState(fetcher:typeof fetch=fetch,signal?:AbortSignal){
 return requestJson('/api/game?mode=recovery',{cache:'no-store'},fetcher,8000,signal);
}
export async function fetchGameState(action?:unknown,fetcher:typeof fetch=fetch,timeoutMs=action===undefined||(action&&typeof action==='object'&&'type' in action&&action.type==='select')?30000:8000,cursor?:GameSyncCursor,signal?:AbortSignal):Promise<{res:Response;data:any}>{
 if(signal?.aborted)throw abortError();
 const attempts=action===undefined?2:1;
 for(let attempt=0;attempt<attempts;attempt++){
  let result:{res:Response;data:any};
  try{
   const query=cursor?'?'+new URLSearchParams({character:cursor.character,after:String(cursor.after),settings:cursor.settingsKey}).toString():'';
   result=await requestJson('/api/game'+query,{method:action===undefined?'GET':'POST',headers:action===undefined?undefined:{'Content-Type':'application/json'},body:action===undefined?undefined:JSON.stringify(action),cache:'no-store'},fetcher,timeoutMs,signal);
  }catch(e){
   if(signal?.aborted)throw abortError();
   if(attempt+1<attempts){await retryDelay(signal);continue;}
   throw Error(action===undefined?`連線中斷：${e instanceof Error?e.message:'未知網路錯誤'}。正在重新連線…`:`操作結果尚待確認（${e instanceof Error?e.message:'網路請求失敗'}）；正在讀取伺服器存檔，請勿重複操作。`);
  }
  if(action===undefined&&(result.res.status===409||result.res.status>=500)&&attempt+1<attempts){await retryDelay(signal);continue;}
  return result;
 }
 throw Error('連線暫時中斷，正在重新連線…');
}
