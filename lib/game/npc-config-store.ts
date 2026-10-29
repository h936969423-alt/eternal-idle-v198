import {cleanDisplayValue} from './game-display-text';
import {env} from 'cloudflare:workers';
import {initialNpcConfig,type NpcConfig} from './npc-config';
export async function getNpcConfig():Promise<NpcConfig>{
 if(!env.DB)throw Error('NPC 設定無法儲存');await env.DB.prepare('INSERT INTO world_settings (id,payload,revision,updated_at) VALUES (?,?,0,?) ON CONFLICT(id) DO NOTHING').bind('npcs',JSON.stringify(initialNpcConfig()),Date.now()).run();
 const row=await env.DB.prepare('SELECT payload,revision FROM world_settings WHERE id=?').bind('npcs').first<{payload:string;revision:number}>();if(!row)throw Error('無法讀取 NPC 設定');return {...initialNpcConfig(),...JSON.parse(row.payload,cleanDisplayValue),revision:row.revision};
}
