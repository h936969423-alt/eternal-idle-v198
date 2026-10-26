import table from './magic-int-table.json';
/** Published INT table. Equipment bonuses are added once in stats(). */
export function magicIntBonuses(value:number){
 const r=table.rows[Math.max(0,Math.min(table.rows.length-1,Math.floor(value||1)-1))];
 return {mdmg:r[0],magicHit:r[1],sp:r[2],mpReduce:r[3],magicCrit:r[4]};
}
export function spellMrMultiplier(value:number){const mr=Math.max(0,value||0);return mr<=100?1-mr/200:mr<=200?.5-(mr-100)/1000:mr<=400?.4-(mr-200)*.00075:mr<=600?.25-(mr-400)*.0006:mr<=800?.13-(mr-600)*.0004:mr<=1000?.05-(mr-800)*.0002:.01;}
export function effectiveElementResist(v:number){return Math.max(0,Math.min(100,v<=50?v:50+Math.floor((v-50)/5)));}
export function sourceIntSp(v:number){const rows=[[11,2],[15,3],[19,4],[23,5],[27,6],[31,7],[35,8],[39,9],[43,10],[47,11],[51,12],[55,13],[59,14],[60,15],[63,16],[66,17],[69,18],[72,20],[75,21],[77,23],[79,24],[80,25],[83,26],[86,27],[89,28],[92,30],[95,31],[97,33],[99,34]];return rows.find(r=>v<=r[0])?.[1]??35;}
export function sourceMagicCoef(b:Record<string,number>,tier:number,resistance=0){const intSp=Math.min(33,sourceIntSp(b.int||0)),itemSp=Math.max(0,(b.sp||0)-(b.intMagicApplied?magicIntBonuses(b.int).sp:0));return Math.max(0,1-effectiveElementResist(resistance)/100+3*Math.max(1,intSp+itemSp)/32)*(1+Math.max(0,tier||0)/10);}
export function magicDamageFromRoll(roll:number,tier:number,b:Record<string,number>,mr:number,critical:boolean,cls='elf'){return Math.max(1,Math.floor((roll+Math.max(0,b.mdmg||0))*sourceMagicCoef(b,tier)*(critical?1+(b.magicCritDmg??50)/100:1)*spellMrMultiplier(mr)));}
export function fixedHealing(rule:[number,number],b:Record<string,number>){return Math.max(0,Math.floor(rule[0]+rule[1]*magicIntBonuses(b.int).sp));}
/** Keep independent 3.81 weapon/doll proc formulas from counting the new INT rows twice. */
export function legacyProcStats(b:Record<string,number>){if(!b.intMagicApplied)return b;const i=magicIntBonuses(b.int);return {...b,sp:(b.sp||0)-i.sp,mdmg:(b.mdmg||0)-i.mdmg,magicCrit:(b.magicCrit||0)-i.magicCrit};}

