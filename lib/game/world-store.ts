import { env } from 'cloudflare:workers';
import { DEFAULT_WORLD_RULES, type WorldConfig } from './world-rules';
import type { ChatGPTUser } from '../../app/chatgpt-auth';
export function isGameMaster(user:ChatGPTUser|null):boolean{
 const email=(env as unknown as {GM_OWNER_EMAIL?:string}).GM_OWNER_EMAIL;
 return !!user&&!!email&&user.email.trim().toLowerCase()===email.trim().toLowerCase();
}
export async function getWorldConfig():Promise<WorldConfig>{
 if(!env.DB)throw new Error('world storage unavailable');
 const now=Date.now();const initial={...DEFAULT_WORLD_RULES,revision:0,updatedAt:now,history:[{...DEFAULT_WORLD_RULES,at:now,by:'initial'}]};
 await env.DB.prepare('INSERT INTO world_settings (id,payload,revision,updated_at) VALUES (?,?,0,?) ON CONFLICT(id) DO NOTHING').bind('world',JSON.stringify(initial),now).run();
 const row=await env.DB.prepare('SELECT payload,revision FROM world_settings WHERE id=?').bind('world').first<{payload:string;revision:number}>();
 if(!row)throw new Error('world storage unavailable');return {...JSON.parse(row.payload),revision:row.revision};
}
