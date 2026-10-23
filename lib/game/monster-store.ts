import {equipment381Settings} from './equipment381-settings';
import {env} from 'cloudflare:workers';
import type {MonsterConfig} from './monster-config';
export async function getMonsterConfig():Promise<MonsterConfig>{if(!env.DB)throw Error('monster storage unavailable');await env.DB.prepare('INSERT INTO world_settings (id,payload,revision,updated_at) VALUES (?,?,0,?) ON CONFLICT(id) DO NOTHING').bind('monsters',JSON.stringify({definitions:{},bossDrops:{},history:[]}),Date.now()).run();const row=await env.DB.prepare('SELECT payload,revision FROM world_settings WHERE id=?').bind('monsters').first<{payload:string;revision:number}>();if(!row)throw Error('monster storage unavailable');return equipment381Settings({...JSON.parse(row.payload),revision:row.revision});}
