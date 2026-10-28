import {defaultEquipmentRank} from './equipment-ranks';

/** Shared player weapon progression for rare (blue) through mythic (gold). */
export function hasUnlimitedWeaponGrowth(id:string,item:any){
 return !!item&&item.type==='wpn'&&!item.isArrow&&!item.noEquip&&!item.noEnh&&
  ['rare','hero','legend','mythic'].includes(defaultEquipmentRank(id.split('@')[0],item));
}
/** Totals relative to +0; never sum the rows. */
export function weaponGrowth(en:number){
 const level=Number.isFinite(en)?Math.max(0,Math.floor(en)):0;
 if(level<=6)return {damage:level,hit:level};
 if(level<=9)return {damage:2*level-6,hit:2*level-6};
 if(level===10)return {damage:16,hit:14};
 if(level<=14)return {damage:21+5*(level-11),hit:16+2*(level-11)};
 const n=level-15;
 return {damage:42+8*n+n*(n-1)/2,hit:25+3*n};
}
/** Source W growth stays separate. Replace only the legacy flat +en bonus. */
export function weaponEnhancementBonus(id:string,item:any,en:number,hasSourceProfile:boolean){
 if(hasUnlimitedWeaponGrowth(id,item))return weaponGrowth(en);
 const flat=hasSourceProfile?0:en;
 return {damage:flat,hit:flat};
}
