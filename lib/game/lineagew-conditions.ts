/** Conditional W attributes. These functions never mutate the shared derived stats. */
export const isPlayerTarget=(m:any)=>!!(m?.player||m?.isPlayer||m?.pvp);
export function lineageWMagicStats(b:Record<string,number>,m:any){
 const pvp=isPlayerTarget(m);return {...b,sp:(b.sp||0)+(pvp?b.pvpSp||0:b.pveSp||0),mdmg:(b.mdmg||0)+(pvp?0:b.pveMdmg||0)};
}
export function lineageWMagicTarget(b:Record<string,number>,m:any){return {...m,mr:Math.max(0,Math.max(0,(m.mr||0)-(b.ignoreMr||0))*(1-Math.max(0,Math.min(100,b.magicPen||0))/100))};}
export function lineageWDefenseStats(b:Record<string,number>,m:any):Record<string,number>{const pvp=isPlayerTarget(m);return {...b,ac:b.ac-(pvp?b.pvpAc||0:b.pveAc||0),mr:b.mr+(pvp?0:b.pveMr||0),dr:b.dr+(pvp?b.pvpDr||0:b.pveDr||0),er:b.er+(b.absoluteEr||0)};}
export const LW_CONDITIONAL_FIELDS=['pvpRangedHit','pvpMagicHit','pvpSp','pvpMeleeDmg','pvpRangedDmg','pvpAc','pveAc','pveDr','pveHit','pveDmg','pveMeleeDmg','pveRangedDmg','pveMdmg','pveMr','pveSp','targetMeleeHit','absoluteEr','magicEr','poisonResist','silenceResist','slowResist','stunHit','blindHit','ignoreMeleeDr','ignoreRangedDr','ignoreMagicDr','maxShield','shieldRegen','magicPen','earthDamage','windDamage','stunDamageReductionPct','statusDamagePct','ignoreDamageReductionPct','ignoreCounterPct','allIgnoreDr','ignoreAcBonus','ignoreErBonus','penetrating'];

export function lineageWCounterDamage(amount:number,reflectPct:number,ignorePct:number,rng:()=>number){if(ignorePct>0&&rng()*100<Math.min(100,ignorePct))return 0;return Math.max(0,Math.floor(amount*Math.max(0,Math.min(100,reflectPct))/100));}
