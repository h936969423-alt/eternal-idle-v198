import rareEquipment from './rare-equipment-reference.json';
import advancedEquipment from './advanced-equipment-reference.json';
import normalEquipment from './normal-equipment-reference.json';
/** Eternal progression defaults; GM per-item classifications always take precedence. */
export function isProgressionEquipment(i:any){return !!i&&['wpn','arm','acc'].includes(i.type)&&!i.noEquip&&!i.isArrow&&!i.doll&&!i.petEquip&&!i.petEquipment&&!i.petOnly&&!/^pet/.test(i.slot||'');}
const mythic=new Set(['ap381_weapon_12','ap381_weapon_61','ap381_weapon_86','ap381_weapon_213','ap381_weapon_217']);
export function defaultEquipmentRank(id:string,i:any):'normal'|'advanced'|'rare'|'hero'|'legend'|'mythic'{
 if(i?.lwCatalogId)return i.lwGrade as 'normal'|'advanced'|'rare'|'hero'|'legend'|'mythic';
 if(isProgressionEquipment(i)&&i.source==='lineagew'&&i.lwMythicId)return 'mythic';
 if(!isProgressionEquipment(i)||i.source!=='apang381')return 'normal';
 if(Object.hasOwn(rareEquipment.items,id))return 'rare';
 if(Object.hasOwn(advancedEquipment.items,id))return 'advanced';
 if(Object.hasOwn(normalEquipment.items,id))return 'normal';
 if(mythic.has(id))return 'mythic';
 const price=Number(i.p)||0,level=Number(i.minLv)||0;
 if(level>=70||price>=500000)return 'legend';
 if(level>=55||price>=150000)return 'hero';
 if(level>=40||price>=30000)return 'rare';
 if(level>=15||price>=3000)return 'advanced';
 return 'normal';
}
