import {syncDelay} from './sync-policy';
type SyncState={running:boolean;failures:number;pending:boolean};
/** First load and foreground restores must work even when an embedded browser reports hidden. */
export function startGamePolling({request,getState,hasPending,doc=document,win=window,clock=()=>performance.now(),schedule=setTimeout,cancel=clearTimeout}:{request:()=>Promise<unknown>;getState:()=>SyncState;hasPending:()=>boolean;doc?:Pick<Document,'visibilityState'|'addEventListener'|'removeEventListener'>;win?:Pick<Window,'addEventListener'|'removeEventListener'>;clock?:()=>number;schedule?:typeof setTimeout;cancel?:typeof clearTimeout}){
 let stopped=false,polling=false,timer:ReturnType<typeof setTimeout>|undefined;
 const poll=async(force=false)=>{if(stopped||polling)return;polling=true;const started=clock();try{if(force||doc.visibilityState==='visible')await request();}finally{polling=false;if(!stopped){const s=getState();const delay=s.failures||hasPending()?syncDelay(s.running,s.failures):Math.max(1000,syncDelay(s.running,0,s.pending));timer=schedule(()=>void poll(),delay);}}};
 const wake=()=>{if(timer!==undefined)cancel(timer);void poll(true);};
 const visible=()=>{if(doc.visibilityState==='visible')wake();};
 void poll(true);doc.addEventListener('visibilitychange',visible);win.addEventListener('pageshow',wake);win.addEventListener('focus',wake);
 return ()=>{stopped=true;if(timer!==undefined)cancel(timer);doc.removeEventListener('visibilitychange',visible);win.removeEventListener('pageshow',wake);win.removeEventListener('focus',wake);};
}
