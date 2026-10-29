import {itemRarity,itemDisplayName} from './loot-appearance';
import {isProgressionEquipment} from './equipment-ranks';
import {npcOriginalService,findNpc} from './npc-config';
import {NPC_HUB,NPC_HUB_ZONE} from './npc-hub';
import {hasModifiers} from './affix-rules';
import raw from './gamedata.json';
import type {Character} from './engine';
import {baseItem} from './gear';
const items=raw.items as Record<string,any>;
export type Recipe={id:string;npc:string;output:string;materials:Record<string,number>;gold:number;outputCount?:number;dailyCap?:number;minLv?:number;classes?:string[];materialEnhancements?:Record<string,number>;availableFrom?:number;availableUntil?:number;disabledReason?:string;source:string};
const imported=NPC_HUB.recipes as unknown as Recipe[];
const oldPanacea:Recipe[]=['str','dex','con','int','wis'].map(stat=>({id:'tas_'+stat,npc:'npc_moli',output:'panacea_'+stat,materials:{panacea_white:3},gold:0,source:'阿肥公開配方：純白萬能藥 ×3'}));
const seen=new Set<string>();
export const NPC_RECIPES:Recipe[]=[...oldPanacea,...imported,...Object.entries(items).filter(([,i])=>i.moonEx).map(([id,i]):Recipe=>({id:'moon_'+id,npc:'npc_events',output:id,materials:{[String(i.moonEx.from)]:i.moonEx.need},gold:i.moonEx.gold||0,dailyCap:i.moonEx.dailyCap,disabledReason:'此活動目前沒有已確認的開放期間，暫停兌換。',source:'阿肥公開道具兌換欄位'}))].filter(r=>{const key=JSON.stringify([r.npc,r.output,r.materials,r.gold,r.outputCount||1,r.classes||[],r.materialEnhancements||{},r.availableUntil||0,r.availableFrom||0,r.minLv||0,r.disabledReason||'',r.dailyCap||0]);if(seen.has(key))return false;seen.add(key);return true;});
export function recipesFor(npc:string,c?:Character){
 const base=NPC_RECIPES.filter(r=>r.npc===npc&&items[r.output]&&Object.keys(r.materials).every(id=>!!items[id]));
 if(npc!=='npc_hector')return base;
 const gear=Object.entries(items).filter(([,i])=>isProgressionEquipment(i)&&['apang381','lineagew'].includes(i.source)&&i.p>0&&!i.noSell);
 return [...base,...gear.flatMap(([id])=>{const rank=itemRarity(id,c?.lootAppearance);if(rank!=='legend'&&rank!=='mythic')return [];const myth=rank==='mythic';return [{id:'progression_'+id,npc,output:id,materials:myth?{mat_legend_shard:100,mat_mythic_shard:300}:{mat_legend_shard:100},gold:myth?3000000:1000000,minLv:myth?75:55,source:'永夜既有混合掉落製作配方'} as Recipe];})];
}
function freeMaterial(c:Character,key:string,id:string,en=0){return baseItem(key)===id&&!c.locked?.includes(key)&&(c.enh[key]||0)===en&&!hasModifiers(c,key)?Math.max(0,(c.bag[key]||0)-Object.values(c.equipment).filter(e=>e.id===key).length):0;}
export function availableMaterial(c:Character,id:string,en=0){return Object.keys(c.bag).reduce((sum,key)=>sum+freeMaterial(c,key,id,en),0);}
export function recipeUnavailable(r:Recipe,c:Character,now=Date.now()){
 if(r.disabledReason)return r.disabledReason;
 if(r.availableFrom&&now<r.availableFrom||r.availableUntil&&now>=r.availableUntil)return '活動尚未開始或已結束';
 if(r.classes&&!r.classes.includes(c.cls))return '職業不符';
 if(r.minLv&&c.lv<r.minLv)return `需達 Lv.${r.minLv}`;
 return '';
}
export function consumeRecipeMaterials(c:Character,materials:Record<string,number>,quantity:number,enhancements:Record<string,number>={}){
 for(const [id,n] of Object.entries(materials))if(availableMaterial(c,id,enhancements[id]||0)<n*quantity)throw Error(`${items[id]?.n||id} 材料不足（鎖定、穿戴或帶詞綴物品不會消耗）`);
 for(const [id,n] of Object.entries(materials)){let need=n*quantity;for(const key of Object.keys(c.bag)){const take=Math.min(need,freeMaterial(c,key,id,enhancements[id]||0));if(!take)continue;c.bag[key]-=take;need-=take;if(!c.bag[key]){delete c.bag[key];delete c.enh[key];}if(!need)break;}}
}
export function craftRecipe(c:Character,npc:string,id:string,quantity:number,daily:Record<string,number>,now:number){
 const r=recipesFor(npc,c).find(r=>r.id===id);
 if(c.zone!==NPC_HUB_ZONE||!findNpc(c.zone,npc,c.npcConfig)||!r||!npcOriginalService(c.zone,npc,c.npcConfig))throw Error('請到銀騎士村對應的 NPC 製作或兌換');
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>999)throw Error('數量需為 1～999');
 const reason=recipeUnavailable(r,c,now);if(reason)throw Error(reason);
 const gold=r.gold*quantity,count=(r.outputCount||1)*quantity;
 if(!Number.isSafeInteger(gold)||!Number.isSafeInteger(count)||!Number.isSafeInteger((c.bag[r.output]||0)+count))throw Error('數量超出可用範圍');
 const day=new Date(now+8*3600000).toISOString().slice(0,10),dailyKey=day+':'+r.id;
 if(r.dailyCap&&(daily[dailyKey]||0)+quantity>r.dailyCap)throw Error('已達此帳號今日兌換上限');
 if(c.gold<gold)throw Error('金幣不足');
 consumeRecipeMaterials(c,r.materials,quantity,r.materialEnhancements);
 c.gold-=gold;c.bag[r.output]=(c.bag[r.output]||0)+count;
 if(r.dailyCap)daily[dailyKey]=(daily[dailyKey]||0)+quantity;
 for(const key of Object.keys(daily))if(!key.startsWith(day+':'))delete daily[key];
 return `製作／兌換 ${itemDisplayName(r.output,c.lootAppearance)} ×${count}`;
}
