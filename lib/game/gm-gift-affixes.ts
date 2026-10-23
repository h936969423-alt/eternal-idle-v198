import {ANCIENT_NAMES,ELEMENT_NAMES,isPetEquipment,type Affix} from './affix-rules';
export type GiftAffixes=Pick<Affix,'blessing'|'ancient'|'element'>;
/** GM gifts use the existing three-family system on the imported catalog as well. */
export function giftAffixEligible(item:any){return !!item&&['wpn','arm','acc'].includes(item.type)&&!item.isArrow&&!item.doll&&!item.noEquip&&(!item.noAffix||item.source==='apang381')&&!item.wearHours&&!isPetEquipment(item);}
export function validateGiftAffixes(input:unknown,item:any):Affix|undefined{
 if(input===undefined)return;
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('詞條設定無效');
 const a=input as Record<string,any>;
 if(Object.keys(a).some(k=>!['blessing','ancient','element'].includes(k)))throw Error('詞條設定無效');
 if(!Object.keys(a).length)return;
 if(!giftAffixEligible(item))throw Error('此裝備不能賦予三系詞條');
 const result:Affix={key:'families',name:'',value:0};
 if(a.blessing!==undefined){if(!['blessed','cursed'].includes(a.blessing))throw Error('祝福／詛咒詞條無效');result.blessing=a.blessing;}
 if(a.ancient!==undefined){if(typeof a.ancient!=='string'||!Object.hasOwn(ANCIENT_NAMES,a.ancient))throw Error('遠古詞條無效');result.ancient=a.ancient as Affix['ancient'];}
 if(a.element!==undefined){const e=a.element;if(!e||typeof e!=='object'||Array.isArray(e)||typeof e.element!=='string'||!Object.hasOwn(ELEMENT_NAMES,e.element)||!Number.isInteger(e.tier)||e.tier<1||e.tier>5||Object.keys(e).some(k=>!['element','tier'].includes(k)))throw Error('元素詞條需指定有效屬性與 1 至 5 階');result.element={element:e.element,tier:e.tier};}
 return result;
}
export function giftAffixSummary(a:GiftAffixes){return [a.element&&ELEMENT_NAMES[a.element.element][a.element.tier-1],a.ancient&&ANCIENT_NAMES[a.ancient],a.blessing&&(a.blessing==='blessed'?'祝福的':'詛咒的')].filter(Boolean).join(' · ');}
