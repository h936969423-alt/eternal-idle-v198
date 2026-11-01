import {isRetiredItem} from './retired-items';
import raw from './gamedata.json';
import data from './npc-hub-data.json';
import importedItems from './afei-npc-items.json';
export const NPC_HUB_ZONE='town_silver_knight';
export const NPC_HUB=data;
const towns=raw.towns as Record<string,any>;
// Apply once before service catalogs are evaluated; every raw-data reader sees the same village.
Object.assign(raw.items,importedItems);
for(const [zone,town] of Object.entries(towns))town.npcs=zone===NPC_HUB_ZONE?data.npcs:[];
export function hubNpcId(id:string){return data.npcs.some(n=>n.id===id)?id:Object.entries(data.aliases).find(([key])=>key.endsWith(':'+id))?.[1];}
export function hubGroup(id:string){return data.npcs.find(n=>n.id===id)?.group||'other';}
export function hubAliases(id:string){return Object.entries(data.aliases).filter(([,target])=>target===id).map(([key])=>key);}
export function hubLegacySetting<T>(id:string,settings?:Record<string,T>):T|undefined{
 if(!settings)return undefined;
 const key=NPC_HUB_ZONE+':'+id;if(Object.hasOwn(settings,key))return settings[key];
 const keys=[...new Set([...hubAliases(id),...Object.keys(settings).filter(key=>key.endsWith(':'+id))])],sameId=keys.find(key=>key.endsWith(':'+id));
 // Names, visibility and function come from the chosen representative; a hidden
 // duplicate merchant must not inadvertently disable the consolidated service.
 return sameId&&Object.hasOwn(settings,sameId)?settings[sameId]:undefined;
}
export function hubDefaultStock(id:string,now=Date.now()):Record<string,number>|undefined{
 const stocks=data.stocks as Record<string,Record<string,number>>;
 if(!Object.hasOwn(stocks,id))return undefined;
 // Published frost shop: Taiwan 2026-10-29 12:30 through 2026-11-03 12:30.
 if(id==='npc_events'&&(now<1793248200000||now>=1793680200000))return {};
 const items=raw.items as Record<string,any>;
 return Object.fromEntries(Object.entries(stocks[id]).filter(([item])=>items[item]&&!isRetiredItem(item)&&(!items[item].availFrom||items[item].availFrom<=now)));
}
export function hubShopSetting(id:string,settings?:Record<string,Record<string,number>>){
 if(!settings)return undefined;
 const canonical=NPC_HUB_ZONE+':'+id;
 const keys=[...new Set([...hubAliases(id),...Object.keys(settings).filter(key=>key.endsWith(':'+id))])].filter(key=>key!==canonical&&Object.hasOwn(settings,key));
 if(Object.hasOwn(settings,canonical))keys.push(canonical);
 return keys.length?Object.assign({},...keys.map(key=>settings[key])) as Record<string,number>:undefined;
}
