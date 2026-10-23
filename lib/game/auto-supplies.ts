import raw from './gamedata.json';
import {baseItem} from './gear';
import type {Character} from './engine';
export const ARROW_BUNDLE=1000,ARROW_BUNDLE_GOLD=1000; // Local price: original bundle price not visible.
const items=raw.items as Record<string,any>;
export function arrowCount(c:Character){return Object.entries(c.bag).filter(([id])=>items[baseItem(id)]?.isArrow&&!c.locked?.includes(id)).reduce((n,[,count])=>n+count,0);}
export function consumeArrows(c:Character,n:number){if(arrowCount(c)<n)throw Error('箭矢不足');for(const id of Object.keys(c.bag)){if(!items[baseItem(id)]?.isArrow||c.locked?.includes(id))continue;const take=Math.min(n,c.bag[id]);c.bag[id]-=take;n-=take;if(!c.bag[id])delete c.bag[id];if(!n)break;}}
export function restockArrows(c:Character,enabled:boolean){if(!enabled||!items[baseItem(c.equipment.weapon?.id||'')]?.isBow||arrowCount(c)>0||c.locked?.includes('wpn_22'))return '';if(c.gold<ARROW_BUNDLE_GOLD)return '';c.gold-=ARROW_BUNDLE_GOLD;c.bag.wpn_22=(c.bag.wpn_22||0)+ARROW_BUNDLE;return `自動補購銀箭 ×${ARROW_BUNDLE}，扣除 ${ARROW_BUNDLE_GOLD} 金幣`;}
export function autoAntidote(c:Character,enabled:boolean,now:number){if(!enabled||!(c.buffs.status_poison?.until>now))return '';const id=Object.keys(c.bag).find(id=>baseItem(id)==='new_item_237'&&c.bag[id]>0&&!c.locked?.includes(id));if(!id)return '';c.bag[id]--;if(!c.bag[id])delete c.bag[id];delete c.buffs.status_poison;return '自動使用安特的樹枝，已解除中毒';}
