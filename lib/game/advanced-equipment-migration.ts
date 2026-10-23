import reference from './advanced-equipment-reference.json';
import type {LootAppearanceConfig} from './loot-appearance';
/** One-time approved correction; later GM edits remain authoritative. */
export function migrateAdvancedEquipmentConfig(config:LootAppearanceConfig,now=Date.now()):LootAppearanceConfig{
 if((config.advancedEquipmentVersion||0)>=reference.version)return config;
 const items={...config.items};
 for(const [id,match] of Object.entries(reference.items))items[id]={...items[id],name:match.name,rarity:'advanced',color:'#00ff00'};
 return {...config,items,advancedEquipmentVersion:reference.version,revision:config.revision+1,
  history:[...config.history,{at:now,by:'system',action:'advanced-equipment-v1',count:Object.keys(reference.items).length}].slice(-30)};
}
