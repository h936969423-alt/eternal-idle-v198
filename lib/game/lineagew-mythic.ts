import {lineageWEquipmentProfile} from './lineagew-equipment';
import reference from './lineagew-mythic-reference.json';
type AdditionalStats=Partial<Record<'int'|'doubleChance'|'er'|'mdmg'|'mpR'|'magicHit'|'sp'|'magicPen'|'ignoreMr'|'pvpMagicAmp'|'holyRate',number>>;
export type MythicGrowth=AdditionalStats&{hit:number;damage:number;ignoreDr:number;ignoreEr:number;maxS:number;maxL:number;minS:number;minL:number;crit:number;str?:number;dex?:number;undead:number;hitPct:number;ignoreCounter:number;ignoreAc:number;assaultRate:number;dispelRate:number;revealRate:number};
export type MythicReference={sourceId:number;name:string;weaponKind?:'sword'|'bow'|'dual'|'staff';sourceUrl:string;iconUrl:string;verifiedAt:string;stage:number;safe:number;growthInterpretation:string;assaultName:string;base:AdditionalStats&{minS:number;maxS:number;minL:number;maxL:number;hit:number;damage:number;str?:number;dex?:number;crit:number;ignoreDr:number;ignoreEr:number;undead:number;hitPct:number;ignoreAc:number;ignoreCounter:number};growth:MythicGrowth[]};
export const MYTHIC_PROTOTYPES=reference.items as Record<string,MythicReference>;
export function lineageWReference(item:any){return item?.source==='lineagew'?MYTHIC_PROTOTYPES[item.lwMythicId]:undefined;}
/** Published enhancement rows are total additions relative to +0, never cumulative steps. */
export function lineageWProfile(item:any,en=0){
 const regular=lineageWEquipmentProfile(item,en);if(regular)return regular;
 const ref=lineageWReference(item);if(!ref)return null;
 const stage=Number.isFinite(en)?Math.min(7,Math.max(0,Math.floor(en))):0,growth=ref.growth[stage],b=ref.base,kind=ref.weaponKind||(item.isBow?'bow':'sword');
 return {ref,stage,growth,kind,minS:b.minS+growth.minS,maxS:b.maxS+growth.maxS,minL:b.minL+growth.minL,maxL:b.maxL+growth.maxL,hit:b.hit+growth.hit,damage:b.damage+growth.damage,str:(b.str||0)+(growth.str||0),dex:(b.dex||0)+(growth.dex||0),int:(b.int||0)+(growth.int||0),crit:b.crit+growth.crit,ignoreDr:b.ignoreDr+growth.ignoreDr,ignoreEr:b.ignoreEr+growth.ignoreEr,ignoreAc:b.ignoreAc+growth.ignoreAc,undead:b.undead,undeadExtra:growth.undead,hitPct:b.hitPct+growth.hitPct,ignoreCounter:b.ignoreCounter+growth.ignoreCounter,doubleChance:(b.doubleChance||0)+(growth.doubleChance||0),er:(b.er||0)+(growth.er||0),mdmg:(b.mdmg||0)+(growth.mdmg||0),mpR:(b.mpR||0)+(growth.mpR||0),magicHit:(b.magicHit||0)+(growth.magicHit||0),sp:(b.sp||0)+(growth.sp||0),magicPen:(b.magicPen||0)+(growth.magicPen||0),ignoreMr:(b.ignoreMr||0)+(growth.ignoreMr||0),pvpMagicAmp:(b.pvpMagicAmp||0)+(growth.pvpMagicAmp||0)};
}
export function lineageWGrowth(item:any,en:number):Record<string,number>{
 if(!lineageWReference(item))return {};
 const p=lineageWProfile(item,en);if(!p||!('growth' in p))return {};
 const g=p.growth;return {str:g.str||0,dex:g.dex||0,int:g.int||0,[p.kind==='staff'?'magicCrit':item.isBow?'rangedCrit':'meleeCrit']:g.crit,doubleChance:g.doubleChance||0,er:g.er||0,mdmg:g.mdmg||0,mpR:g.mpR||0,magicHit:g.magicHit||0,sp:g.sp||0};
}
/** W trial mapping: subtract the listed flat MR bypass, then apply percentage penetration. */
export function lineageWMagicTarget(item:any,en:number,target:any){const p=lineageWProfile(item,en);return p?.kind==='staff'&&item?.lwMythicId?{...target,mr:Math.max(0,(target.mr||0)-p.ignoreMr)*(1-Math.max(0,Math.min(100,p.magicPen))/100)}:target;}
