import {lineageWActiveId} from './lineagew-migration';
import raw from './gamedata.json';
import referenceMap from './equipment381-reference-map.json';
import type {MonsterConfig,DropEntry} from './monster-config';
const items=raw.items as Record<string,any>,mapping=referenceMap as Record<string,string>;
/** Old GM configuration is retained in storage; only valid catalog entries reach the game. */
export function equipment381Drops(drops:DropEntry[]=[]){
 const combined=new Map<string,DropEntry>();
 for(const d of drops){const id=lineageWActiveId(mapping[d.item]||d.item);if(!id||!items[id])continue;const before=combined.get(id);if(before)combined.set(id,{...before,chance:Math.max(before.chance,d.chance),min:Math.max(before.min,d.min),max:Math.max(before.max,d.max),enabled:before.enabled||d.enabled});else combined.set(id,{...d,item:id});}
 return [...combined.values()];
}
function migrateRule(rule:any){if(!rule)return undefined;const equipmentIds=[...new Set((rule.equipmentIds||[]).map(lineageWActiveId).filter((id:unknown)=>typeof id==='string'))];return {...rule,equipmentIds,...(rule.pool==='custom'&&!equipmentIds.length?{pool:'map'}:{})};}
export function equipment381Settings(config:MonsterConfig):MonsterConfig{
 return {...config,definitions:Object.fromEntries(Object.entries(config.definitions||{}).map(([id,m])=>[id,{...m,drops:equipment381Drops(m.drops),...(m.hybrid?{hybrid:migrateRule(m.hybrid)}:{})}])),bossDrops:Object.fromEntries(Object.entries(config.bossDrops||{}).map(([id,b])=>[id,{...b,drops:equipment381Drops(b.drops),...(b.hybrid?{hybrid:migrateRule(b.hybrid)}:{})}]))};
}
