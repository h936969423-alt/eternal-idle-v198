import {itemRarity,itemDisplayName} from './loot-appearance';
import {isProgressionEquipment} from './equipment-ranks';
import {npcOriginalService} from './npc-config';
import {hasModifiers} from './affix-rules';
import raw from './gamedata.json';
import type {Character} from './engine';
import {baseItem} from './gear';
const items=raw.items as Record<string,any>;
export type Recipe={id:string;npc:string;output:string;materials:Record<string,number>;gold:number;dailyCap?:number;minLv?:number;source:string};
// Only recipes with explicit public quantities; no inferred equipment recipes.
export const NPC_RECIPES:Recipe[]=[...['str','dex','con','int','wis'].map(stat=>({id:'tas_'+stat,npc:'npc_tas',output:'panacea_'+stat,materials:{panacea_white:3},gold:0,source:'公開 NPC 說明：純白萬能藥 ×3'})),...Object.entries(items).filter(([,i])=>i.moonEx).map(([id,i])=>({id:'moon_'+id,npc:'npc_moonrabbit',output:id,materials:{[i.moonEx.from]:i.moonEx.need},gold:i.moonEx.gold||0,dailyCap:i.moonEx.dailyCap,source:'公開道具兌換欄位'}))];
export function recipesFor(npc:string,c?:Character){const base=NPC_RECIPES.filter(r=>r.npc===npc&&items[r.output]&&Object.keys(r.materials).every(id=>!!items[id]));if(npc!=='npc_tas')return base;const gear=Object.entries(items).filter(([,i])=>isProgressionEquipment(i)&&['apang381','lineagew'].includes(i.source)&&i.p>0&&!i.noSell);return [...base,...gear.flatMap(([id])=>{const rank=itemRarity(id,c?.lootAppearance);if(rank!=='legend'&&rank!=='mythic')return [];const myth=rank==='mythic';return [{id:'progression_'+id,npc,output:id,materials:myth?{mat_legend_shard:100,mat_mythic_shard:300}:{mat_legend_shard:100},gold:myth?3000000:1000000,minLv:myth?75:55,source:'永夜混合掉落製作配方'} as Recipe];})];}
export function availableMaterial(c:Character,id:string){return Object.entries(c.bag).filter(([key,n])=>n>0&&baseItem(key)===id&&!c.locked?.includes(key)&&!(c.enh[key]>0)&&!hasModifiers(c,key)).reduce((sum,[key,n])=>sum+Math.max(0,n-Object.values(c.equipment).filter(e=>e.id===key).length),0);}
export function craftRecipe(c:Character,npc:string,id:string,quantity:number,daily:Record<string,number>,now:number){
 const vendor=(raw.towns as Record<string,any>)[c.zone]?.npcs.find((n:any)=>n.id===npc);const r=recipesFor(npc,c).find(r=>r.id===id);if(!vendor||!r||!npcOriginalService(c.zone,npc,c.npcConfig))throw Error('請到對應村莊的 NPC 製作或兌換');if(!Number.isInteger(quantity)||quantity<1||quantity>999)throw Error('數量需為 1～999');if(r.minLv&&c.lv<r.minLv)throw Error(`需達 Lv.${r.minLv} 才能製作`);const day=new Date(now+8*3600000).toISOString().slice(0,10),dailyKey=day+':'+r.id;
 if(r.dailyCap&&(daily[dailyKey]||0)+quantity>r.dailyCap)throw Error('已達此帳號今日兌換上限');if(c.gold<r.gold*quantity)throw Error('金幣不足');for(const [id,n] of Object.entries(r.materials))if(availableMaterial(c,id)<n*quantity)throw Error(`${items[id]?.n||id} 材料不足（鎖定、強化與穿戴物品不會消耗）`);
 // Validate every cost before any mutation.
 for(const [id,n] of Object.entries(r.materials)){let need=n*quantity;for(const key of Object.keys(c.bag)){if(!need)break;if(baseItem(key)!==id||c.locked?.includes(key)||c.enh[key]>0||hasModifiers(c,key))continue;const free=c.bag[key]-Object.values(c.equipment).filter(e=>e.id===key).length,take=Math.min(need,Math.max(0,free));c.bag[key]-=take;need-=take;if(!c.bag[key])delete c.bag[key];}}
 c.gold-=r.gold*quantity;c.bag[r.output]=(c.bag[r.output]||0)+quantity;if(r.dailyCap)daily[dailyKey]=(daily[dailyKey]||0)+quantity;for(const key of Object.keys(daily))if(!key.startsWith(day+':'))delete daily[key];return `製作／兌換 ${itemDisplayName(r.output,c.lootAppearance)} ×${quantity}`;
}
