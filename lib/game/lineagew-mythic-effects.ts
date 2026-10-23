import type {Character} from './engine';
/** Published values, with explicitly local Eternal interpretations for unknown formulas. */
export const LW_MYTHIC_FIELDS=['hitPct','ignoreMr','repulsionResist','ignoreMeleeCrit','ignoreRangedCrit','ignoreMagicCrit','ignoreMeleeAmpPct','ignoreRangedAmpPct','ignoreMeleeVulnerabilityPct','ignoreRangedVulnerabilityPct','counterIgnoreDefensePct','hotBonusPct','healBonusPct','waterDamage','waterErosionIMax','waterErosionIReduction','waterErosionIIMax','waterErosionIIReduction','incomingMeleeFlat','incomingRangedFlat','incomingMagicFlat','cancelImmuneBypass','incomingDamagePct'] as const;
const bounded=(n:number)=>Math.max(0,Math.min(100,n||0));
export function mythicIncomingAmount(c:Character,b:Record<string,number>,amount:number,now:number,magic=false,source:any={}){
 const ranged=!!(source.ranged||source.isBow),amp=magic?0:source.damageAmpPct||source[ranged?'rangedDamageAmpPct':'meleeDamageAmpPct']||0,ignoreAmp=b[ranged?'ignoreRangedAmpPct':'ignoreMeleeAmpPct']||0;
 let damage=amount;if(amp>0)damage*=(1+Math.max(0,amp-ignoreAmp)/100)/(1+amp/100);
 const vulnerable=c.buffs.status_vulnerable?.until>now?c.buffs.status_vulnerable.d.incomingDamagePct||0:0,ignore=magic?0:b[ranged?'ignoreRangedVulnerabilityPct':'ignoreMeleeVulnerabilityPct']||0;
 damage*=1+Math.max(0,(b.incomingDamagePct||vulnerable)-ignore)/100;
 if(c.buffs.lw_osiris_protection?.until>now)damage*=.8;
 return Math.max(0,Math.floor(damage-(b[magic?'incomingMagicFlat':ranged?'incomingRangedFlat':'incomingMeleeFlat']||0)));
}
export function mythicHealing(gain:number,b:Record<string,number>,hot=false){return Math.max(0,Math.floor(gain*(1+(b.healBonusPct||0)/100)*(hot?1+(b.hotBonusPct||0)/100:1)));}
/** Gear enables an erosion threshold; without gear the existing dragon behavior is preserved. */
export function applyWaterErosion(c:Character,b:Record<string,number>,tier:'I'|'II',now:number){
 const key=tier==='I'?'status_potionErosion':'status_healingErosion',field='waterErosion'+tier;
 if(!(b[field+'Max']>0||b[field+'Reduction']>0)){c.buffs[key]={until:now+12000,d:{[tier==='I'?'potionErosion':'healingErosion']:1}};return {index:100,threshold:100};}
 const previous=c.buffs[key],index=(previous?.until>now?previous.d.erosionIndex||0:0)+Math.max(0,25-(b[field+'Reduction']||0)),threshold=100*(1+(b[field+'Max']||0)/100);
 c.buffs[key]={until:now+12000,d:{[tier==='I'?'potionErosion':'healingErosion']:1,erosionIndex:index,erosionThreshold:threshold}};return {index,threshold};
}
export function waterErosionActive(buff:{until:number;d:Record<string,number>}|undefined,now:number){return !!buff&&buff.until>now&&(!('erosionIndex' in buff.d)||buff.d.erosionIndex>=buff.d.erosionThreshold);}
export function mythicCancelHit(immune:boolean,bypass:number,rng:()=>number){return !immune||bypass>0&&rng()*100<bounded(bypass);}
export function mythicMonsterMagicDamage(amount:number,b:Record<string,number>,source:any,rng:()=>number){const chance=Math.max(0,(source.magicCrit||0)-(b.ignoreMagicCrit||0));return chance>0&&rng()*100<Math.min(100,chance)?Math.floor(amount*(1+(source.magicCritDmg??50)/100)):amount;}
