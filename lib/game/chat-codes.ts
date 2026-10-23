import type {Character,Save} from './engine';
export const VIP888_CODE='.VIP888';
export const VIP888_REWARDS=[{id:'potion_greater_haste',name:'強化加速藥水',quantity:10},{id:'scroll_poly',name:'變形卷軸',quantity:5},{id:'potion_heal',name:'紅色藥水',quantity:500}] as const;
export const VIP888_REWARD_TEXT=VIP888_REWARDS.map(r=>`${r.name} ×${r.quantity}`).join('、');
export function normalizeChatCode(value:unknown){return typeof value==='string'?value.trim().toUpperCase():'';}
/** Receipt and inventory are committed together by the account save's compare-and-swap. */
export function redeemChatCode(save:Save,c:Character,value:unknown,now:number){
 const code=normalizeChatCode(value);
 if(code!==VIP888_CODE)throw Error('兌換指令無效');
 if(save.codeRedemptions?.VIP888)throw Error('此帳號已領取 .VIP888，每個帳號限領一次');
 for(const reward of VIP888_REWARDS)c.bag[reward.id]=(c.bag[reward.id]||0)+reward.quantity;
 save.codeRedemptions={...save.codeRedemptions,VIP888:{at:now,characterId:c.id}};
 return `.VIP888 領取成功：${VIP888_REWARD_TEXT}，已放入 ${c.name} 的背包。`;
}
