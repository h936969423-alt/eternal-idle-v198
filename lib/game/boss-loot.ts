import raw from './gamedata.json';
import {PUBLIC_DROP_RATES,WORLD_BOSS_LOOT} from './monster-loot';
import {bossMembers} from './boss-respawn';
import type {DropEntry} from './monster-config';
const items=raw.items as Record<string,any>;
/** Local Eternal defaults where no original per-item probability is available. */
function localChance(id:string){const i=items[id];return ['wpn','arm','acc'].includes(i?.type)?1:i?.type==='skillbk'?1:i?.type==='pot'?20:5;}
export function bossMemberDrops(zone:string,mob:string):DropEntry[]{
 const published=PUBLIC_DROP_RATES[mob];
 const entries=published!==undefined?published.map(d=>({...d,min:1,max:1,enabled:true})):[];
 const seen=new Set(entries.map(d=>d.item));
 const fallback=WORLD_BOSS_LOOT[zone]?.length?WORLD_BOSS_LOOT[zone]:['scroll_armor','scroll_weapon'];
 for(const item of fallback)if(!seen.has(item)&&items[item]){entries.push({item,chance:localChance(item),min:1,max:1,enabled:true});seen.add(item);}
 return entries.filter(d=>d.item!=='mat_boss_crystal'&&items[d.item]);
}
export function bossRoomDrops(zone:string){const entries=new Map<string,DropEntry>();for(const m of bossMembers(zone))for(const d of bossMemberDrops(zone,m.mob)){const old=entries.get(d.item);entries.set(d.item,{...d,chance:Math.max(old?.chance||0,d.chance)});}return [...entries.values()];}
export function bossGoldRange(m:{goldMin?:number;goldMax?:number}){const min=Math.max(1,Math.floor(m.goldMin||10000)),max=Math.max(min,Math.floor(m.goldMax||20000));return {min,max};}
