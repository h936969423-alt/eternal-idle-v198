import {getChatGPTUser} from '../../chatgpt-auth';
export const dynamic='force-dynamic';
const phases=new Set(['document-start','client-mounted','state-ready','startup-timeout','script-error','script-check','client-error','client-rejection']);
export async function POST(request:Request){
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return new Response(null,{status:403});
 if(!await getChatGPTUser())return new Response(null,{status:204});
 try{const body=await request.text();if(body.length>2048)return new Response(null,{status:400});const data=JSON.parse(body);if(!phases.has(data.phase))return new Response(null,{status:400});console.info('game-client-health',JSON.stringify({phase:data.phase,elapsed:Math.max(0,Math.min(3600000,Number(data.elapsed)||0)),visibility:['visible','hidden','prerender'].includes(data.visibility)?data.visibility:'unknown',message:typeof data.message==='string'?data.message.slice(0,300):undefined,file:typeof data.file==='string'?data.file.split('?')[0].slice(0,250):undefined}));return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}});}catch{return new Response(null,{status:400});}
}
