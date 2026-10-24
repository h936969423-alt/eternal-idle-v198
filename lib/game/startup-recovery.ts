/** Kept inline in the server HTML so recovery works when the React bundle never starts. */
export function installStartupRecovery(){
 if(location.pathname!=='/')return;
 const started=Date.now();let mounted=false,ready=false;
 const phase=(name:string,message?:string,file?:string)=>{try{void fetch('/api/client-health',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phase:name,elapsed:Date.now()-started,visibility:document.visibilityState,message:typeof message==='string'?message.slice(0,300):undefined,file:typeof file==='string'?file.split('?')[0].slice(0,250):undefined}),keepalive:true}).catch(()=>{});}catch{}};
 const show=()=>{if(mounted)return;const box=document.getElementById('game-startup-recovery');if(box){box.hidden=false;}const link=document.getElementById('game-startup-reload') as HTMLAnchorElement|null;if(link){const url=new URL(location.href);url.searchParams.set('__game_reload',String(Date.now()));link.href=url.href;}};
 // A slow module download must be allowed to finish; reloading here aborts it.
 const hint=setTimeout(show,35000),timeout=setTimeout(()=>{if(!mounted){show();phase('startup-timeout');}},60000);
 window.addEventListener('game-client-mounted',()=>{if(mounted)return;mounted=true;clearTimeout(hint);clearTimeout(timeout);const box=document.getElementById('game-startup-recovery');if(box)box.hidden=true;phase('client-mounted');});
 window.addEventListener('game-state-ready',()=>{if(ready)return;ready=true;phase('state-ready');});
 window.addEventListener('error',event=>{const el=event.target as (HTMLScriptElement&HTMLLinkElement)|null;if(el?.tagName==='SCRIPT'||el?.tagName==='LINK'){const file=el.src||el.href;phase('script-error','script resource load failed',file);try{const url=new URL(file,location.href);if(url.origin===location.origin)void fetch(url.href,{method:'HEAD',credentials:'include',cache:'no-store'}).then(r=>phase('script-check',String(r.status)+' '+r.headers.get('Content-Type'),url.pathname)).catch(e=>phase('script-check',String(e.message),url.pathname));}catch{}if(!mounted)show();}else phase('client-error',event.message,event.filename);},true);
 window.addEventListener('unhandledrejection',event=>phase('client-rejection',String(event.reason?.message||event.reason||'unknown'),String(event.reason?.stack||'').slice(0,250)));
 window.addEventListener('securitypolicyviolation',event=>phase('client-error','CSP '+event.violatedDirective,event.blockedURI));
 phase('document-start');
}
export const STARTUP_RECOVERY_SCRIPT=`(${installStartupRecovery.toString()})();`;
