import reference from './normal-equipment-reference.json';
import type {LootAppearanceConfig} from './loot-appearance';

/** Apply this approved catalog correction once, preserving later GM edits. */
export function migrateNormalEquipmentConfig(config:LootAppearanceConfig,now=Date.now()):LootAppearanceConfig{
 if((config.normalEquipmentVersion||0)>=reference.version)return config;
 const items={...config.items};
 for(const [id,match] of Object.entries(reference.items)){
  items[id]={...items[id],name:match.name,rarity:'normal'};
 }
 return {...config,items,normalEquipmentVersion:reference.version,revision:config.revision+1,
  history:[...config.history,{at:now,by:'system',action:'normal-equipment-v1',count:Object.keys(reference.items).length}].slice(-30)};
}
