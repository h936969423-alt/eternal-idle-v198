import {syncDelay} from './sync-policy';
type SyncState={running:boolean;failures:number;pending:boolean};
/** One read at a time. Wake events cancel stale reads and coalesce into one refresh. */
export function startGamePolling({request,getState,hasPending,abortRead=()=>{},doc=document,win=window,clock=()=>performance.now(),schedule=setTimeout,cancel=clearTimeout}:{request:()=>Promise<unknown>;getState:()=>SyncState;hasPending:()=>boolean;abortRead?:()=>void;doc?:Pick<Document,'visibilityState'|'addEventListener'|'removeEventListener'>;win?:Pick<Window,'addEventListener'|'removeEventListener'>;clock?:()=>number;schedule?:typeof setTimeout;cancel?:typeof clearTimeout}){
 let stopped=false,polling=false,suspended=false,wakeRequested=false,timer:ReturnType<typeof setTimeout>|undefined;
 const clear=()=>{if(timer!==undefined){cancel(timer);timer=undefined;}};
 const poll=async(force=false)=>{
  if(stopped||suspended||polling)return;
  clear();polling=true;
  try{if(!hasPending()&&(force||doc.visibilityState==='visible'||getState().pending))await request();}
  catch{/* The request reports its error; the scheduler must still recover. */}
  finally{
   polling=false;
   if(!stopped&&!suspended){
    const immediate=wakeRequested;wakeRequested=false;
    const s=getState();
    timer=schedule(()=>void poll(immediate),immediate?0:syncDelay(s.running,s.failures,s.pending));
   }
  }
 };
 const wake=()=>{
  if(stopped||suspended)return;clear();
  if(polling){if(!wakeRequested){wakeRequested=true;abortRead();}return;}
  void poll(true);
 };
 const visible=()=>{if(doc.visibilityState==='visible')wake();else{clear();abortRead();}};
 const offline=()=>{suspended=true;wakeRequested=false;clear();abortRead();};
 const online=()=>{suspended=false;wake();};
 void poll(true);
 doc.addEventListener('visibilitychange',visible);win.addEventListener('pageshow',wake);win.addEventListener('focus',wake);win.addEventListener('offline',offline);win.addEventListener('online',online);
 return ()=>{stopped=true;clear();abortRead();doc.removeEventListener('visibilitychange',visible);win.removeEventListener('pageshow',wake);win.removeEventListener('focus',wake);win.removeEventListener('offline',offline);win.removeEventListener('online',online);};
}
