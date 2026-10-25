import {env} from 'cloudflare:workers';
import {initialCombatEffects,type CombatEffectsConfig} from './imported-effects';
export async function getCombatEffects():Promise<CombatEffectsConfig>{
 if(!env.DB)throw Error('特效設定暫時無法讀取');const initial=initialCombatEffects();
 await env.DB.prepare('INSERT INTO world_settings (id,payload,revision,updated_at) VALUES (?,?,0,?) ON CONFLICT(id) DO NOTHING').bind('combat_effects',JSON.stringify(initial),Date.now()).run();
 const row=await env.DB.prepare('SELECT payload,revision FROM world_settings WHERE id=?').bind('combat_effects').first<{payload:string;revision:number}>();
 if(!row)throw Error('特效設定暫時無法讀取');const saved=JSON.parse(row.payload);return {...initial,...saved,defaults:{...initial.defaults,...saved.defaults},revision:row.revision};
}
