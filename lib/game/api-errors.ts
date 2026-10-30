/** Lightweight error boundary: no engine imports, bodies, cookies or owner IDs in logs. */
export type ApiContext={requestId:string;rayId:string;phase:string;operation:string;mutation:boolean;commit:'none'|'unknown'|'confirmed';started:number};
export class ApiInputError extends Error{constructor(message:string,public status=400){super(message);this.name='ApiInputError';}}
export function apiContext(request:Request):ApiContext{return {requestId:crypto.randomUUID(),rayId:(request.headers.get('cf-ray')||'').slice(0,100),phase:'auth',operation:request.method==='GET'?'poll':'unknown',mutation:request.method==='POST',commit:'none',started:performance.now()};}
export function apiHeaders(context:ApiContext){return {'Cache-Control':'no-store','X-Request-ID':context.requestId};}
export function apiErrorResponse(request:Request,error:unknown,context:ApiContext,source='game-api-error'){
 const message=error instanceof Error?error.message:'Unknown error';
 const storage=/storage|database|\bD1\b|SQLITE|save not found|no such table/i.test(message);
 const business=context.phase==='action'&&error instanceof Error&&error.name==='Error';
 const status=error instanceof ApiInputError?error.status:storage?503:business?400:500;
 const uncertain=context.mutation&&context.commit!=='none';
 const detail={event:source,requestId:context.requestId,rayId:context.rayId,method:request.method,path:new URL(request.url).pathname,phase:context.phase,operation:context.operation,commit:context.commit,status,elapsedMs:Math.round(performance.now()-context.started),errorName:error instanceof Error?error.name:typeof error,message:message.slice(0,1000),stack:error instanceof Error?error.stack?.slice(0,6000):undefined};
 if(status>=500)console.error(detail,error instanceof Error?error:undefined);else console.warn(detail);
 const text=uncertain?'操作結果尚待確認；請先讀取伺服器存檔，勿重複操作。':error instanceof ApiInputError||business?message:storage?'存檔服務暫時忙碌，請稍後再試。':'操作失敗，請稍後再試。';
 return Response.json({error:text,requestId:context.requestId,code:storage?'STORAGE_UNAVAILABLE':status>=500?'INTERNAL_ERROR':'INVALID_OPERATION',outcome:uncertain?'unconfirmed':'not_committed'},{status,headers:apiHeaders(context)});
}
/** Bound mutation bodies before parsing; a game action never contains an entire save. */
export async function readGameAction(request:Request){
 const max=64*1024,length=Number(request.headers.get('Content-Length')||0);
 if(length>max)throw new ApiInputError('操作資料過大',413);
 const reader=request.body?.getReader();if(!reader)throw new ApiInputError('操作資料不可空白');
 const decoder=new TextDecoder();let text='',bytes=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>max){void reader.cancel().catch(()=>{});throw new ApiInputError('操作資料過大',413);}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}
 let value:any;try{value=JSON.parse(text);}catch{throw new ApiInputError('操作資料不是有效的 JSON');}
 if(!value||typeof value!=='object'||Array.isArray(value)||typeof value.type!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(value.type))throw new ApiInputError('操作類型無效');
 return value;
}
/** The framework can fail before invoking a route. Resource-limit kills still
 * happen outside JavaScript and must be investigated in Workers invocation logs. */
export async function protectGameApi(request:Request,run:()=>Promise<Response>){
 if(new URL(request.url).pathname.replace(/\/$/,'')!=='/api/game')return run();
 const context=apiContext(request);context.phase='framework';if(context.mutation)context.commit='unknown';
 try{
  const response=await run(),type=response.headers.get('Content-Type')||'';
  if(response.status>=500&&!/application\/(?:[\w.-]+\+)?json/i.test(type)){
   void response.body?.cancel().catch(()=>{});
   return apiErrorResponse(request,new Error(`Framework returned non-JSON HTTP ${response.status}`),context,'game-worker-error');
  }
  return response;
 }catch(error){return apiErrorResponse(request,error,context,'game-worker-error');}
}
