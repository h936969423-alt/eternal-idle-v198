import {validateGiftAffixes,giftAffixSummary} from './gm-gift-affixes';
import type {Affix} from './affix-rules';
import {equipmentOptions,weaponOptions,itemOptions} from './gm-item-options';
export {equipmentOptions} from './gm-item-options';
import {levelPointGain,upgradeAbilityPoints} from './ability-points';
import { DATA, log, stats, event, type Save } from './engine';
export type Grant = {characterId:string;type:'gold'|'levelUp'|'setLevel'|'equipment'|'weapon'|'item';level?:number;itemId?:string;quantity?:number;enhancement?:number;amount?:number;affixes?:Affix};
export function validateGrant(input:any):Grant {
 if(!input||typeof input.characterId!=='string')throw new Error('請選擇角色');
 const grant:Grant={characterId:input.characterId,type:input.type};
 if(!['gold','levelUp','setLevel','equipment','weapon','item'].includes(input.type))throw new Error('無效的 GM 操作');
 if(input.type==='gold'){const amount=input.amount===undefined?50000:input.amount;if(!Number.isSafeInteger(amount)||amount<1)throw new Error('金額必須為正整數且未超過安全上限');grant.amount=amount;}
 if(input.type==='setLevel'){if(!Number.isInteger(input.level)||input.level<1||input.level>99)throw new Error('等級必須是 1 至 99');grant.level=input.level;}
 if(['equipment','weapon','item'].includes(input.type)){
 const options=input.type==='weapon'?weaponOptions:input.type==='item'?itemOptions:equipmentOptions;
 const item=options.find(i=>i.id===input.itemId);if(!item)throw new Error('請選擇此分類的有效道具');
 const max=input.type==='item'?10000:100;if(!Number.isInteger(input.quantity)||input.quantity<1||input.quantity>max)throw new Error(`數量必須是 1 至 ${max}`);
 grant.itemId=item.id;grant.quantity=input.quantity;
 const enhancement=input.enhancement??0;if(!Number.isSafeInteger(enhancement)||enhancement<0)throw new Error('強化值必須為可精確儲存的非負整數');if(item.cap!==null&&enhancement>item.cap)throw new Error('此道具不能指定強化值');
 if(input.type!=='item')grant.enhancement=enhancement;
 const affixes=validateGiftAffixes(input.affixes,DATA.items[item.id]);if(affixes)grant.affixes=affixes;
 }
 return grant;
}
export function applyGrant(save:Save,grant:Grant,now=Date.now()) {
 const c=save.characters.find(c=>c.id===grant.characterId);if(!c)throw new Error('找不到此帳號的角色');upgradeAbilityPoints(c);
 let message='';
 if(grant.type==='gold'){const amount=grant.amount??50000;if(!Number.isSafeInteger(c.gold+amount))throw new Error('金幣已達上限');c.gold+=amount;message=`${c.name} 獲得 ${amount.toLocaleString()} 金幣`;}
 else if(['equipment','weapon','item'].includes(grant.type)){const id=grant.itemId!;const amount=(c.bag[id]||0)+grant.quantity!;if(!Number.isSafeInteger(amount))throw new Error('道具數量已達上限');const enhancement=grant.enhancement||0;if(enhancement>0||grant.affixes){for(let n=0;n<grant.quantity!;n++){const key=id+'@'+crypto.randomUUID();c.bag[key]=1;if(enhancement>0)c.enh[key]=enhancement;if(grant.affixes){c.affixes||={};c.affixes[key]=structuredClone(grant.affixes);}}}else c.bag[id]=amount;if(DATA.items[id].doll)c.dollCollection=[...new Set([...(c.dollCollection||[]),id])];message=`${c.name} 獲得 ${grant.type==='item'?'':`+${enhancement} `}${DATA.items[id].n} ×${grant.quantity}${grant.affixes?` · ${giftAffixSummary(grant.affixes)}`:''}`;}
 else {const level=grant.type==='levelUp'?c.lv+1:grant.level!;if(level>99||level<=c.lv)throw new Error(c.lv>=99?'角色已達 99 級':'指定等級必須高於目前等級');const gained=levelPointGain(c.lv,level);c.points+=gained;c.lv=level;c.xp=0;const s=stats(c,now);c.hp=s.maxHp;c.mp=s.maxMp;message=`${c.name} 提升至 ${level} 級，能力點 +${gained}（51 級起每級 1 點）`;}
 log(c,`GM：${message}`,'info',now);event(c,'state',now);return message;
}
