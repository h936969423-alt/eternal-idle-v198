import reference from './rare-equipment-reference.json';
import type {LootAppearanceConfig} from './loot-appearance';
/** Apply the approved rare catalog once; subsequent GM changes are preserved. */
export function migrateRareEquipmentConfig(config:LootAppearanceConfig,now=Date.now()):LootAppearanceConfig{
 if((config.rareEquipmentVersion||0)>=reference.version)return config;
 const items={...config.items};
 for(const [id,match] of Object.entries(reference.items))items[id]={...items[id],name:match.name,rarity:'rare',color:'#0080ff'};
 return {...config,items,rareEquipmentVersion:reference.version,revision:config.revision+1,
  history:[...config.history,{at:now,by:'system',action:'rare-equipment-v1',count:Object.keys(reference.items).length}].slice(-30)};
}
