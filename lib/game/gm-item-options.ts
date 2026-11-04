import raw from './gamedata.json';
import {RETIRED_ITEMS} from './retired-items';
export type GiftCategory='weapon'|'equipment'|'potion'|'book'|'scroll'|'misc';
/** GM can override player enhancement restrictions on equippable gear; ordinary scroll rules are unchanged. */
export type GiftOption={id:string;label:string;name:string;cap:number|null;category:GiftCategory};
export const giftOptions:GiftOption[]=Object.entries(raw.items as Record<string,any>).filter(([id])=>!Object.hasOwn(RETIRED_ITEMS,id)).map(([id,i])=>{
 const equippable=['wpn','arm','acc'].includes(i.type)&&!i.isArrow&&!i.noEquip;
 const category:GiftCategory=equippable?(i.type==='wpn'?'weapon':'equipment'):i.type==='skillbk'||i.sk||i.eff==='gmAllMagic'?'book':i.type==='scroll'||/卷軸/.test(i.n)?'scroll':i.type==='pot'&&i.eff!=='whistle'||/藥水|萬能藥/.test(i.n)?'potion':'misc';
 return {id,name:i.n,label:i.n,cap:equippable?null:0,category};
});
export const weaponOptions=giftOptions.filter(i=>i.category==='weapon');
export const armorOptions=giftOptions.filter(i=>i.category==='equipment');
export const equipmentOptions=giftOptions.filter(i=>['weapon','equipment'].includes(i.category));
export const itemOptions=giftOptions.filter(i=>!['weapon','equipment'].includes(i.category));
/** GM-created equipment joins the (live) option lists whenever its definitions are loaded. */
export function refreshCustomGiftOptions(){
 for(const list of [giftOptions,weaponOptions,armorOptions,equipmentOptions])for(let n=list.length-1;n>=0;n--)if(list[n].id.startsWith('gmx_'))list.splice(n,1);
 for(const [id,i] of Object.entries(raw.items as Record<string,any>)){if(i.source!=='gm'||Object.hasOwn(RETIRED_ITEMS,id))continue;const weapon=i.type==='wpn',option:GiftOption={id,name:i.n,label:i.n,cap:null,category:weapon?'weapon':'equipment'};giftOptions.push(option);(weapon?weaponOptions:armorOptions).push(option);equipmentOptions.push(option);}
}
