/** Keep combat responsive; slow idle sync and back off when the connection fails. */
export function syncDelay(running:boolean,failures=0,pending=false){return failures>0?Math.min(8000,1000*2**Math.min(failures-1,3)):pending?1200:running?3500:6000;}
