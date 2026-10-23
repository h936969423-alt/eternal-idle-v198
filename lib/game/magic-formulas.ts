import table from './magic-int-table.json';
/** Published INT table. Equipment bonuses are added once in stats(). */
export function magicIntBonuses(value:number){
 const r=table.rows[Math.max(0,Math.min(74,Math.floor(value||1)-1))];
 return {mdmg:r[0],magicHit:r[1],sp:r[2],mpReduce:r[3],magicCrit:r[4]};
}
export function spellMrMultiplier(value:number){const mr=Math.max(0,value||0);return Math.max(0,mr<=100?1-mr/200:.5-(mr-100)/1000);}
/** Round once at the end; only dice receive the critical multiplier. */
export function magicDamageFromRoll(roll:number,tier:number,b:Record<string,number>,mr:number,critical:boolean,cls='elf'){
 return Math.max(0,Math.floor((roll*(critical?1.5+Math.max(0,(b.magicCritDmg||100)-100)/100:1)*(1+3*(b.mdmg||0)/16)*(1+(tier||0)/3)+(b.sp||0))*spellMrMultiplier(mr)*(cls==='mage'?1.5:1)));
}
export function fixedHealing(rule:[number,number],b:Record<string,number>){return Math.max(0,Math.floor(rule[0]+rule[1]*magicIntBonuses(b.int).sp));}
/** Keep independent 3.81 weapon/doll proc formulas from counting the new INT rows twice. */
export function legacyProcStats(b:Record<string,number>){if(!b.intMagicApplied)return b;const i=magicIntBonuses(b.int);return {...b,sp:(b.sp||0)-i.sp,mdmg:(b.mdmg||0)-i.mdmg,magicCrit:(b.magicCrit||0)-i.magicCrit};}
