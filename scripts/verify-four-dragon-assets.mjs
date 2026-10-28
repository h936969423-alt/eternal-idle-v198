import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
const manifest=JSON.parse(readFileSync('lib/game/four-dragon-atlases.json','utf8'));
const sheets=new Map();
for(const id of ['antaras','fafurion','valakas','lindvior']){
 const clips=manifest[id];if(!clips)throw Error(`Missing dragon ${id}`);
 for(const action of ['idle','attack','skill','death','spawn','skill_effect'])if(!clips[action])throw Error(`Missing ${id} ${action}`);
 for(const [action,s] of Object.entries(clips)){
  if(!s.src.startsWith('/assets/four-dragons/')||s.src.includes('..')||!s.src.endsWith('.webp'))throw Error(`External or invalid sprite ${s.src}`);
  if(!(s.count>0&&s.w>0&&s.h>0&&s.cols>0&&s.rows>0&&s.cols*s.rows>=s.count))throw Error(`Invalid frame layout ${id} ${action}`);
  if(!/^[0-9a-f]{64}$/.test(s.sha256)||!(s.bytes>0))throw Error(`Missing integrity metadata ${s.src}`);
  sheets.set(s.src,s);
 }
}
function verify(s,bytes){
 if(bytes.length!==s.bytes)throw Error(`Size mismatch ${s.src}: ${bytes.length} != ${s.bytes}`);
 if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP')throw Error(`Not a WebP image: ${s.src}`);
 const sha=createHash('sha256').update(bytes).digest('hex');if(sha!==s.sha256)throw Error(`SHA256 mismatch ${s.src}`);
}
if(process.argv.includes('--live')){
 const origin=new URL(process.env.DRAGON_ASSET_ORIGIN||'https://eternal-idle-v198-test.h936969423.workers.dev');
 if(origin.protocol!=='https:')throw Error('Live asset verification requires HTTPS');
 const pending=[...sheets.values()];let checked=0;
 await Promise.all(Array.from({length:4},async()=>{
  while(pending.length){const s=pending.shift();const url=new URL(s.src,origin);let last;
   for(let attempt=0;attempt<3;attempt++)try{
    const response=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{'Cache-Control':'no-cache'}});
    if(!response.ok)throw Error(`HTTP ${response.status} ${s.src}`);
    if(!(response.headers.get('content-type')||'').includes('image/webp'))throw Error(`Wrong content type ${s.src}`);
    verify(s,Buffer.from(await response.arrayBuffer()));last=undefined;break;
   }catch(error){last=error;}
   if(last)throw last;checked++;
  }
 }));
 console.log(`PASS: ${checked} deployed four-dragon atlases return image/webp and match pinned byte size and SHA256 at ${origin.origin}`);
}else{
 const base=process.argv.includes('--built')?'dist/client':'public';
 for(const s of sheets.values())verify(s,readFileSync(path.join(base,s.src)));
 console.log(`PASS: ${sheets.size} self-contained four-dragon atlases, ${[...sheets.values()].reduce((n,s)=>n+s.count,0)} original frames, byte sizes and SHA256 (${base})`);
}
