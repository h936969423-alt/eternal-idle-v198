import {env} from 'cloudflare:workers';
import {applyCustomEquipment,emptyCustomEquipment,type CustomEquipmentConfig} from './custom-equipment';
import {settingsPayload} from './settings-payload';
/** Reads the live definitions and merges them into this request's item catalog. */
export async function loadCustomEquipment():Promise<CustomEquipmentConfig&{revision:number}>{
 if(!env.DB)throw Error('自訂裝備儲存空間無法使用');
 await env.DB.prepare('INSERT INTO world_settings (id,payload,revision,updated_at) VALUES (?,?,0,?) ON CONFLICT(id) DO NOTHING').bind('custom_equipment',JSON.stringify(emptyCustomEquipment()),Date.now()).run();
 const row=await env.DB.prepare('SELECT id,payload,revision FROM world_settings WHERE id=?').bind('custom_equipment').first<{id:string;payload:string;revision:number}>();
 if(!row)throw Error('無法讀取自訂裝備');
 const config=settingsPayload<CustomEquipmentConfig>(row);applyCustomEquipment(config);return config;
}
