
/** Every weapon can be enhanced without a cap, except GM weapons, which use their own configured cap. */
export function hasUnlimitedWeaponGrowth(id:string,item:any){
 return !!item&&item.source!=='gm'&&item.type==='wpn'&&!item.isArrow&&!item.noEquip&&!item.noEnh;
}
/** Every weapon: each +1 adds exactly +1 hit and +1 flat damage on the final hit; dice ranges stay at +0. */
export function weaponGrowth(en:number){
 const level=Number.isFinite(en)?Math.max(0,Math.floor(en)):0;
 return {damage:level,hit:level};
}
export function weaponEnhancementBonus(en:number){return weaponGrowth(en);}
