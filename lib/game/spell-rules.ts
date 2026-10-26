import {lineageWMagicStats,lineageWMagicTarget,isPlayerTarget} from './lineagew-conditions';
import {targetMagicHit} from './lineagew-equipment-effects';
// Rules pinned to pp771007/idle-lineage-class 5f00f4a86389aaa7309c24d7a7c1ab060c47b500.
import raw from './gamedata.json';
import {fixedHealing,sourceMagicCoef,spellMrMultiplier} from './magic-formulas';
import type {Character} from './engine';
export const ELEMENT_NAMES:Record<string,string>={fire:'火',water:'水',wind:'風',earth:'地'};
export function requiredSkillLevel(c:Pick<Character,'cls'>,s:any){
 const key=({royal:'reqRoy',knight:'reqK',elf:'reqE',mage:'reqM',dark:'reqD'} as Record<string,string>)[c.cls];
 return key&&s[key]!==undefined?Number(s[key]):Infinity;
}
export function elementError(c:Pick<Character,'cls'|'elfEle'>,s:any){if(c.cls!=='elf')return '';if((s.reqEleAny||s.reqEle)&&!c.elfEle)return '請先選擇妖精屬性';if(s.reqEle&&s.reqEle!==c.elfEle)return `需要${ELEMENT_NAMES[s.reqEle]}屬性`;return '';}
export function skillBooks(id:string){return Object.entries(raw.items as Record<string,any>).filter(([,i])=>i.type==='skillbk'&&i.sk===id);}
export function availableSkillBook(c:Pick<Character,'bag'|'locked'>,id:string){return Object.keys(c.bag).find(k=>c.bag[k]>0&&!c.locked?.includes(k)&&skillBooks(id).some(([book])=>k.split('@')[0]===book));}
export function skillMpCost(s:any,b:Record<string,number>){return s.mp?Math.max(1,Math.ceil(s.mp*(1-Math.min(100,b.mpReduce||0)/100))):0;}
export const rollDice=(n:number,sides:number,rng:()=>number)=>{let v=0;for(let i=0;i<n;i++)v+=1+Math.floor(rng()*sides);return v;};
export function abnormalHit(lv:number,b:Record<string,number>,m:any,rng:()=>number,cap=20,offset=0){const hv=Math.max(0,Math.min(cap,lv+targetMagicHit(b,m)+offset-((m.lv||0)-10)-(m.mr||0)/10)),r=rollDice(1,20,rng);return r===20||r!==1&&hv>=r;}
export function healIntBonus(int:number){int=Math.floor(int);return int<=9?-1:int<=11?0:int<=14?1:int<=17?2:int===18?3:int<=25?int-15:Math.min(21,10+Math.floor((int-25)/5));}
export function healingAmount(s:any,b:Record<string,number>,missing:number,rng:()=>number,groupMult=1){if(s.fixedHeal)return Math.min(missing,fixedHealing(s.fixedHeal,b));if(s.fullRestore)return missing;if(s.classicHeal){const x=s.classicHeal;return Math.max(1,Math.floor(rollDice(Math.max(1,x.baseDice+healIntBonus(b.int)),x.sides,rng)*2*(x.mult||1)*(s.groupHeal?groupMult:1)));}if(s.healDice)return Math.max(1,Math.floor((rollDice(...s.healDice as [number,number],rng)+(s.healBase||0))*(1+3*(b.mdmg||0)/32)));return s.valDice?rollDice(...s.valDice as [number,number],rng)+(s.valBase||0):0;}
export function weaponRequirement(s:any,w:any,shield:any){if(s.reqWpn==='bow'&&!w?.isBow)return '需要裝備弓';if(s.reqWpn==='w2h'&&!(!w?.isBow&&(w?.twohanded||w?.w2h||w?.wcat==='tohandsword')))return '需要雙手劍';if(s.reqWpnMelee&&(!w||w.isBow))return '需要近戰武器';if(s.reqShield&&!shield)return '需要裝備盾牌';return '';}
export function spellClockKey(id:string,s:any){return s.type==='manual'?'manual:'+id:s.type==='heal'&&!s.fixedHeal&&!s.valDice&&!s.hot?'purify':s.type==='atk'?'attack':['heal','convert'].includes(s.type)?s.type:undefined;}
export function spellDamage(s:any,b:Record<string,number>,m:any,rng:()=>number,cls='elf',out?:{critical:boolean}){
 b=lineageWMagicStats(b,m);m=lineageWMagicTarget(b,m);
 const dice=s.multiDmg||(s.dmgDice?[s.dmgDice]:[]);if(!dice.length)return 0;
 const critical=rng()*100<Math.max(0,Math.min(100,(b.magicCrit||0)-(m.ignoreMagicCrit||0)));if(out)out.critical=critical;
 const counter:Record<string,string>={fire:'earth',water:'fire',wind:'water',earth:'wind'},element=counter[s.ele]&&counter[s.ele]===m.e?1.4:counter[m.e]&&counter[m.e]===s.ele?.6:1;
 const attr=Number(m['res'+(s.ele&&s.ele!=='none'?s.ele[0].toUpperCase()+s.ele.slice(1):'None')])||0;
 const coef=sourceMagicCoef(b,s.tier,attr),crit=critical?1+(b.magicCritDmg??50)/100:1;
 let total=0;for(let i=0;i<dice.length;i++){const last=i===dice.length-1,roll=rollDice(dice[i][0],dice[i][1],rng),core=(roll+(last?(s.dmgBase||0)+Math.max(0,b.mdmg||0):0))*coef*crit;let hit=Math.max(1,Math.floor(core*spellMrMultiplier(m.mr||0)));hit=Math.max(1,Math.floor(hit*element));total+=hit;}
 return Math.max(0,Math.floor(total*(m.magDmgTakenMult||1))+(!isPlayerTarget(m)?b.pveDmg||0:0)-Math.max(0,(m.magicDr||0)-(b.ignoreMagicDr||0)-(b.allIgnoreDr||0)));
}
export function buffModifiers(id:string,s:any,lv:number,ele?:string){const out={...(s.d||{})};if(s.haste)out.atkSpdPct=33;if(s.moveSpeedMult)out.moveSpeedMult=s.moveSpeedMult;
 const special:Record<string,Record<string,number>>={sk_magic_shield:{magicBarrier:1},sk_holy_barrier:{damageReductionPct:30},sk_reduction_armor:{dr:Math.floor(lv/10)},sk_soul_up:{maxHpPct:20,maxMpPct:20},sk_elf_earthshield:{physicalImmune:1},sk_elf_flamesoul:{maxWeapon:1},sk_invisible:{invisible:1},sk_dark_poisonres:{poisonReductionPct:50},sk_dark_walkhaste:{attackSpeedMult:1/.85},sk_sunlight:{light:1},sk_reveal:{reveal:1},sk_helm_str2:{reveal:1},sk_load_up:{weightCap:50}};
 if(id==='sk_elf_singleres'&&ele)out['res'+ele[0].toUpperCase()+ele.slice(1)]=50;
 return {...out,...special[id]};
}

