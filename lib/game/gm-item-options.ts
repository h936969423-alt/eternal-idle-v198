import raw from './gamedata.json';
export type GiftCategory='weapon'|'equipment'|'potion'|'book'|'scroll'|'misc';
/** GM can override player enhancement restrictions on equippable gear; ordinary scroll rules are unchanged. */
export type GiftOption={id:string;label:string;name:string;cap:number|null;category:GiftCategory};
export const giftOptions:GiftOption[]=Object.entries(raw.items as Record<string,any>).map(([id,i])=>{
 const equippable=['wpn','arm','acc'].includes(i.type)&&!i.isArrow&&!i.noEquip;
 const category:GiftCategory=equippable?(i.type==='wpn'?'weapon':'equipment'):i.type==='skillbk'||i.sk?'book':i.type==='scroll'||/卷軸/.test(i.n)?'scroll':i.type==='pot'&&i.eff!=='whistle'||/藥水|萬能藥/.test(i.n)?'potion':'misc';
 return {id,name:i.n,label:i.n,cap:equippable?null:0,category};
});
export const weaponOptions=giftOptions.filter(i=>i.category==='weapon');
export const armorOptions=giftOptions.filter(i=>i.category==='equipment');
export const equipmentOptions=giftOptions.filter(i=>['weapon','equipment'].includes(i.category));
export const itemOptions=giftOptions.filter(i=>!['weapon','equipment'].includes(i.category));
