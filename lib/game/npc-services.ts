import raw from './gamedata.json';
import {NPC_HUB_ZONE} from './npc-hub';
import {npcOriginalService} from './npc-config';
import {consumeRecipeMaterials} from './npc-recipes';
import {itemRarity} from './loot-appearance';
import type {Character} from './engine';
const items=raw.items as Record<string,any>;
export function requireHubService(c:Character,npc:string){if(c.zone!==NPC_HUB_ZONE||!npcOriginalService(c.zone,npc,c.npcConfig))throw Error('請到銀騎士村對應的 NPC 使用服務');}
export function refineScrolls(c:Character,count:number,rng:()=>number){
 requireHubService(c,'npc_refine');
 if(![1,5,10].includes(count))throw Error('提煉次數需為 1、5 或 10');
 const ordinary=Object.keys(items).filter(id=>items[id].gachaWeight>0&&!items[id]._noGacha&&itemRarity(id)==='normal');
 if(!ordinary.length)throw Error('提煉獎池尚未準備完成');
 consumeRecipeMaterials(c,{scroll_weapon:10,scroll_armor:10},count);
 let wins=0;const rewards:Record<string,number>={};
 for(let n=0;n<count;n++){
  const win=rng()<.01;if(win)wins++;
  const id=win?(rng()<.5?'scroll_weapon_b':'scroll_armor_b'):ordinary[Math.min(ordinary.length-1,Math.floor(rng()*ordinary.length))];
  c.bag[id]=(c.bag[id]||0)+1;rewards[id]=(rewards[id]||0)+1;
 }
 return `提煉 ${count} 次，成功 ${wins} 次：`+Object.entries(rewards).map(([id,n])=>`${items[id]?.n||id} ×${n}`).join('、');
}
export const NPC_SERVICE_NOTICES:Record<string,string>={
 npc_esti:'血盟涉及跨帳號申請、盟主審核、投資及光環。永夜目前未接入多人血盟資料，這裡保留服務說明，不收取建盟或投資金幣。',
 npc_ally_b:'傭兵協力讓其他角色一同出戰。永夜目前仍採單角色狩獵，此處保留公會說明，不把角色切換當作協力戰鬥。',
 npc_aqua:'公開規則：祈福 100 萬、重骰 150 萬，持續 12 小時，1／2 條加成各 50%。條目數值範圍尚未取得完整資料，目前只提供說明，不扣金幣。',
 npc_ispa:'原站提供遺忘之島船票及航行服務。永夜尚未接入原站航程與入場資格，請使用永夜既有地圖入口；這裡不收取船票。',
 npc_mengpo:'原站孟婆提供改名服務；永夜尚未接入原站的改名審核流程，目前保留說明，不扣金幣。',
 npc_lifeiyu:'原站厲飛雨提供全服限量搶購與競拍。永夜尚未接入多人競價及交易所寄件，目前保留說明，不收取押金。',
};
