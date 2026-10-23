import data from './gamedata.json';
import raw from './monster-drops.json';
import rates from './monster-drop-rates.json';
export type PublicDropRate={item:string;chance:number};
export const PUBLIC_DROP_RATES=rates.mobs as Record<string,PublicDropRate[]>;
export const AREA_DROP_RATES=rates.areas as Record<string,PublicDropRate[]>;
export const MONSTER_DROP_CHANCE=.12; // Legacy fallback only for lists without published rates, including special room rewards.
export const PUBLIC_LOOT=raw.mobs as Record<string,{lv:number;hp:number;exp:number;drops:string[]}>;
export const WORLD_BOSS_LOOT=raw.worldBossDrops as Record<string,string[]>;
export function publicMonsterDrop(id:string,rng:()=>number,now=Date.now(),dropPct=0):{known:boolean;items:{item:string;quantity:number}[]}{
 const published=PUBLIC_DROP_RATES[id];
 if(published!==undefined)return {known:true,items:rollPublicRates(published,rng,now,dropPct)};
 const record=PUBLIC_LOOT[id];if(!record)return {known:false,items:[]};
 const item=rollDropList(record.drops,rng,now,dropPct);
 return {known:true,items:item?[{item,quantity:1}]:[]};
}
export function rollPublicRates(entries:PublicDropRate[],rng:()=>number,now=Date.now(),dropPct=0){return entries.filter(d=>{const i=(data.items as Record<string,any>)[d.item];return i&&(!i.availFrom||i.availFrom<=now)&&rng()<Math.min(100,Math.max(0,d.chance*(1+dropPct/100)))/100;}).map(d=>({item:d.item,quantity:1}));}
export function areaMonsterDrops(zone:string,skills:string[],rng:()=>number,now=Date.now(),dropPct=0){const entries=AREA_DROP_RATES[zone]||[];return rollPublicRates(skills.includes('sk_elf_worldtree')?entries.map(d=>({...d,chance:d.chance*1.5})):entries,rng,now,dropPct);}

export function rollDropList(ids:string[],rng:()=>number,now=Date.now(),dropPct=0){const pool=[...new Set(ids)].filter(id=>{const i=(data.items as Record<string,any>)[id];return !!i&&(!i.availFrom||i.availFrom<=now);});if(!pool.length||rng()>=Math.min(1,MONSTER_DROP_CHANCE*(1+dropPct/100)))return null;return pool[Math.min(pool.length-1,Math.floor(rng()*pool.length))];}
