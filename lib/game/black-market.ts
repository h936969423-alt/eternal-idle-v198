import raw from './gamedata.json';
import {itemRarity,type LootAppearanceConfig} from './loot-appearance';
import {npcVisible,findNpc} from './npc-config';
import {NPC_HUB_ZONE} from './npc-hub';
import {grantDroppedItem} from './affix-rules';
import {acquireDollCard} from './doll-cards';
import type {Character} from './engine';
export const BLACK_MARKET_PRICE=300000;
export const BLACK_MARKET_RANKS=['normal','advanced','rare'] as const;
export type BlackMarketRank=typeof BLACK_MARKET_RANKS[number];
export type BlackMarketReceipt={id:string;requestId:string;sequence:number;at:number;count:number;paid:number;free:number;cost:number;progress:number;items:{item:string;rank:BlackMarketRank}[]};
export type BlackMarketState={progress:number;sequence:number;history:BlackMarketReceipt[]};
const items=raw.items as Record<string,any>;
export function blackMarketPools(appearance?:LootAppearanceConfig,now=Date.now()){
 const pools:Record<BlackMarketRank,string[]>={normal:[],advanced:[],rare:[]};
 for(const [id,item]of Object.entries(items)){
  if(!(item.gachaWeight>0)||item._noGacha||item.availFrom>now||item.availUntil&&item.availUntil<=now)continue;
  const rank=itemRarity(id,appearance);if(BLACK_MARKET_RANKS.includes(rank as BlackMarketRank))pools[rank as BlackMarketRank].push(id);
 }
 return pools;
}
export function blackMarketQuote(progress:number,count:number){
 if(![1,10].includes(count))throw Error('抽獎次數需為 1 或 10');
 let next=Number.isInteger(progress)?Math.min(10,Math.max(0,progress)):0,paid=0,free=0;
 for(let n=0;n<count;n++){if(next===10){free++;next=0;}else{paid++;next++;}}
 return {paid,free,cost:paid*BLACK_MARKET_PRICE,progress:next};
}
export function drawBlackMarket(c:Character,input:{npc:unknown;count:unknown;requestId:unknown;sequence:unknown},rng:()=>number,now:number){
 const npc=typeof input.npc==='string'?input.npc:'';
 if(c.zone!==NPC_HUB_ZONE||!npcVisible(c.zone,npc,c.npcConfig)||findNpc(c.zone,npc,c.npcConfig)?.type!=='blackmarket')throw Error('請到銀騎士村的黑市 NPC 使用服務');
 if(c.lv<41)throw Error('黑市抽取需要 Lv.41');
 if(typeof input.requestId!=='string'||!/^[-a-zA-Z0-9_]{8,80}$/.test(input.requestId))throw Error('抽獎識別碼無效，請重新開啟黑市');
 if(typeof input.count!=='number'||![1,10].includes(input.count))throw Error('抽獎次數需為 1 或 10');
 const state=c.blackMarket,previous=state?.history.find(r=>r.requestId===input.requestId);
 if(previous){if(previous.count!==input.count||previous.sequence!==input.sequence)throw Error('抽獎請求內容不符');return {receipt:previous,replayed:true};}
 const sequence=state?.sequence||0;
 if(!Number.isSafeInteger(input.sequence)||input.sequence!==sequence+1)throw Error('抽獎狀態已更新，請重新開啟黑市確認結果');
 const quote=blackMarketQuote(state?.progress||0,input.count);
 if(!Number.isSafeInteger(c.gold)||c.gold<quote.cost)throw Error('金幣不足，需要 '+quote.cost.toLocaleString()+' 金幣');
 const pools=blackMarketPools(c.lootAppearance,now);
 if(BLACK_MARKET_RANKS.some(rank=>!pools[rank].length))throw Error('三種品質獎池尚未完整，暫停抽獎');
 const unit=()=>{const n=rng();if(!Number.isFinite(n)||n<0||n>=1)throw Error('抽獎亂數無效');return n;};
 const awards=Array.from({length:input.count},()=>{const rank=BLACK_MARKET_RANKS[Math.floor(unit()*3)],pool=pools[rank];return {item:pool[Math.floor(unit()*pool.length)],rank};});
 const receipt:BlackMarketReceipt={id:crypto.randomUUID(),requestId:input.requestId,sequence:sequence+1,at:now,count:input.count,...quote,items:awards};
 for(const award of awards){const i=items[award.item];if(i.eff==='dollCard')acquireDollCard(c,i.cardMob,i.cardTier);else grantDroppedItem(c,award.item,1,rng);if(i.doll)c.dollCollection=[...new Set([...(c.dollCollection||[]),award.item])];}
 c.gold-=quote.cost;c.blackMarket={progress:quote.progress,sequence:sequence+1,history:[receipt,...(state?.history||[])].slice(0,32)};
 return {receipt,replayed:false};
}
