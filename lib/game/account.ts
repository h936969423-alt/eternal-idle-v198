import {env} from 'cloudflare:workers';
import {cookies} from 'next/headers';
const encoder=new TextEncoder();
export async function digest(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function passwordHash(password:string,salt:string){const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);return Array.from(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:encoder.encode(salt),iterations:100000,hash:'SHA-256'},key,256))).map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function gameAccount(owner:string){const token=(await cookies()).get('game_session')?.value;if(!token)return null;return env.DB!.prepare('SELECT username FROM game_accounts WHERE owner=? AND session_hash=? AND session_until>?').bind(owner,await digest(token),Date.now()).first<{username:string}>();}
