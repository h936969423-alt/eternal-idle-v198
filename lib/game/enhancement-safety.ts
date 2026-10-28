import {hasUnlimitedWeaponGrowth} from './weapon-enhancement';
/** Display the existing server rules; this helper does not change enhancement odds. */
export function enhancementSafety(id:string,item:any){
 if(!item||!['wpn','arm','acc'].includes(item.type)||item.isArrow||item.noEquip)return null;
 const safe=item.source==='apang381'||item.lwGrade==='mythic'?item.safe:item.type==='acc'?0:item.safe||0;
 const blocked=!!item.noEnh||item.source==='apang381'&&(safe<0||item.bless>=128||item.type==='acc'&&item.greater===3)||
  item.source!=='apang381'&&item.type!=='acc'&&safe===0&&!hasUnlimitedWeaponGrowth(id,item)&&!item.lwMythicId&&item.lwGrade!=='mythic';
 const cap=hasUnlimitedWeaponGrowth(id,item)?Infinity:item.source==='apang381'?(item.type==='acc'?8:Infinity):Math.min(item.enhCap||12,12);
 return {canEnhance:!blocked,safe:Number.isFinite(safe)?Math.max(0,safe):0,cap};
}
