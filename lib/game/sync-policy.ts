/** Keep combat responsive; slow idle sync and back off when the connection fails. */
export function syncDelay(running:boolean,failures=0,pending=false){return failures>0?Math.min(8000,1000*2**Math.min(failures-1,3)):pending?500:running?350:6000;}


/** Keep active polls on a start-to-start cadence; latency must not add another full wait. */
export function nextSyncDelay(running:boolean,failures:number,pending:boolean,elapsedMs:number){
 const delay=syncDelay(running,failures,pending);
 return running&&!failures&&!pending?Math.max(50,delay-Math.max(0,elapsedMs)):delay;
}
