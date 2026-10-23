import {migrateRareEquipmentConfig} from './rare-equipment-migration';
import {migrateAdvancedEquipmentConfig} from './advanced-equipment-migration';
import {env} from 'cloudflare:workers';
import {initialLootAppearance,type LootAppearanceConfig} from './loot-appearance';
import {migrateNormalEquipmentConfig} from './normal-equipment-migration';
export async function getLootAppearanceConfig():Promise<LootAppearanceConfig>{
 if(!env.DB)throw Error('物品顯示設定儲存空間無法使用');
 const initial=initialLootAppearance();
 await env.DB.prepare('INSERT INTO world_settings (id,payload,revision,updated_at) VALUES (?,?,0,?) ON CONFLICT(id) DO NOTHING').bind('item_appearance',JSON.stringify(initial),Date.now()).run();
 for(let attempt=0;attempt<3;attempt++){
  const row=await env.DB.prepare('SELECT payload,revision FROM world_settings WHERE id=?').bind('item_appearance').first<{payload:string;revision:number}>();
  if(!row)throw Error('無法讀取物品顯示設定');
  const saved=JSON.parse(row.payload);
  const config:LootAppearanceConfig={...initial,...saved,defaults:{...initial.defaults,...saved.defaults},revision:row.revision};
  const now=Date.now(),normal=migrateNormalEquipmentConfig(config,now),advanced=migrateAdvancedEquipmentConfig(normal,now),migrated=migrateRareEquipmentConfig(advanced,now);
  const next=migrated===config?config:{...migrated,revision:row.revision+1};
  if(next===config)return config;
  // D1 batch is atomic; retain the exact pre-migration payload before replacing it.
  const result=await env.DB.batch([
   env.DB.prepare('INSERT INTO world_settings (id,payload,revision,updated_at) VALUES (?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(`item_appearance_before_catalog_v3_${row.revision}`,row.payload,row.revision,now),
   env.DB.prepare('UPDATE world_settings SET payload=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?').bind(JSON.stringify(next),now,'item_appearance',row.revision)
  ]);
  if(result[1].meta.changes)return next;
 }
 throw Error('物品設定已被更新，請重新載入');
}
