import {lineageWMagicStats,lineageWMagicTarget,isPlayerTarget} from './lineagew-conditions';
import {legacyProcStats} from './magic-formulas';
import raw from './gamedata.json';
import skills from './weapon-proc-skills.json';
import {getAttrMagic} from './affix-rules';
import type {Character} from './engine';
const definitions=skills as Record<string,any>;
const dice=(n:number,s:number,rng:()=>number)=>Array.from({length:n},()=>1+Math.floor(rng()*s)).reduce((a,b)=>a+b,0);
function intSp(n:number){for(const [end,v]of [[11,2],[15,3],[19,4],[23,5],[27,6],[31,7],[35,8],[39,9],[43,10],[47,11],[51,12],[55,13],[59,14],[60,15],[63,16],[66,17],[69,18],[72,20],[75,21],[77,23],[79,24],[80,25],[83,26],[86,27],[89,28],[92,30],[95,31],[97,33],[99,34]])if(n<=end)return Math.min(33,v);return 33;}
const counter:Record<string,string>={fire:'earth',water:'fire',wind:'water',earth:'wind'};
function mrMult(mr:number){mr=Math.max(0,mr);return mr<=100?1-mr/200:mr<=200?.5-(mr-100)/1000:mr<=400?.4-(mr-200)*.00075:mr<=600?.25-(mr-400)*.0006:mr<=800?.13-(mr-600)*.0004:mr<=1000?.05-(mr-800)*.0002:.01;}
export function triggeredWeaponMagic(c:Character,rng:()=>number){const weapon=(raw.items as Record<string,any>)[(c.equipment.weapon?.id||'').split('@')[0]],proc=weapon?.attackProc;if(proc&&definitions[proc.skill]&&rng()<proc.rate/100)return {skill:proc.skill,rate:proc.rate,definition:definitions[proc.skill]};const magic=getAttrMagic(c.affixes?.[c.equipment.weapon?.id||'']);return magic&&rng()<magic.rate/100?{...magic,definition:definitions[magic.skill]}:null;}
export function weaponMagicDamage(s:any,b:Record<string,number>,m:any,rng:()=>number){b=lineageWMagicStats(legacyProcStats(b),m);m=lineageWMagicTarget(b,m);const res=m['res'+(s.ele||'none')[0].toUpperCase()+(s.ele||'none').slice(1)]||0,eff=res<=50?Math.max(0,res):50+Math.floor((res-50)/5),baseSp=intSp(b.int),coef=(1-Math.min(1,eff/100)+3*Math.max(1,baseSp+(b.sp||0))/32)*(1+(s.tier||1)/10),base=s.multiDmg?s.multiDmg.reduce((n:number,d:number[])=>n+dice(d[0],d[1],rng),0):s.dmgDice?dice(s.dmgDice[0],s.dmgDice[1],rng):0;if(!base)return 0;const mult=counter[s.ele]===m.e?1.4:counter[m.e]===s.ele?.6:1,crit=rng()*100<Math.max(0,(b.magicCrit||0)-(m.ignoreMagicCrit||0))?1+(b.magicCritDmg||100)/100:1;return Math.max(1,Math.floor((base+(s.dmgBase||0)+(b.mdmg||0))*coef*crit*mrMult(m.mr||0)*mult*(m.magDmgTakenMult||1))+(!isPlayerTarget(m)?b.pveDmg||0:0)-Math.max(0,(m.magicDr||0)-(b.ignoreMagicDr||0)-(b.allIgnoreDr||0)));}
