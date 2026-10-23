import {lineageWEquipmentReference} from './lineagew-equipment';
import {weaponMagicDamage} from './weapon-magic';
import {lineageWMagicTarget,lineageWProfile} from './lineagew-mythic';
import type {Encounter} from './engine';
/** Proc rates come from the pinned W item tables. These formulas/durations are Eternal trial rules. */
export const MYTHIC_PROC_RULES={assaultMultiplier:1.5,revealSeconds:5,revealAc:10,dispelLockSeconds:3} as const;
export const MYTHIC_PROC_SKILLS={lw_chaos_assault:{name:'渾沌狂襲',kind:'chaos'},lw_gaia_assault:{name:'蓋亞狂襲',kind:'gaia'},lw_dispel_barrier:{name:'消除聖結界',kind:'dispel'},lw_reveal:{name:'揭露',kind:'reveal'},lw_lightning_assault:{name:'雷電狂襲',kind:'lightning'},lw_holy_magic:{name:'聖潔魔法',kind:'holy'}} as const;
export type MythicProcId=keyof typeof MYTHIC_PROC_SKILLS;
export function mythicProcDefinition(skill?:string){return skill&&Object.hasOwn(MYTHIC_PROC_SKILLS,skill)?MYTHIC_PROC_SKILLS[skill as MythicProcId]:undefined;}
export function mythicProcChances(item:any,en:number){
 const r=lineageWEquipmentReference(item);
 if(r&&item?.type==='wpn'&&item.lwGrade==='mythic'){
  const stage=Math.min(Math.max(0,...Object.keys(r.growth).map(Number)),Math.max(0,Math.floor(Number.isFinite(en)?en:0))),g=r.growth[String(stage)]||{};
  return Object.entries({dispel:'lw_dispel_barrier',reveal:'lw_reveal',holy:'lw_holy_magic',lightning:'lw_lightning_assault',gaia:'lw_gaia_assault',chaos:'lw_chaos_assault'}).map(([key,skill])=>({skill:skill as MythicProcId,rate:(r.stats['lwMythic_'+key]||0)+(g['lwMythic_'+key]||0)})).filter(p=>p.rate>0);
 }
 const p=item?.lwMythicId?lineageWProfile(item,en):null;return p?[{skill:'lw_dispel_barrier' as MythicProcId,rate:p.growth.dispelRate},{skill:'lw_reveal' as MythicProcId,rate:p.growth.revealRate},...(p.kind==='staff'?[{skill:'lw_holy_magic' as MythicProcId,rate:p.growth.holyRate||0}]:[]),{skill:(p.kind==='staff'?'lw_lightning_assault':item.isBow?'lw_gaia_assault':'lw_chaos_assault') as MythicProcId,rate:p.growth.assaultRate}]:[];
}
/** Independent rolls, once per landed weapon strike; no MP and no proc recursion. */
export function rollMythicProcs(item:any,en:number,rng:()=>number){return mythicProcChances(item,en).filter(p=>p.rate>0&&rng()<p.rate/100);}
export function mythicAssaultDamage(item:any,en:number,b:Record<string,number>,m:any,rng:()=>number){
 const p=lineageWProfile(item,en);if(!p)return 0;
 const min=m.s==='L'?p.minL:p.minS,max=m.s==='L'?p.maxL:p.maxS,roll=min+Math.floor(rng()*(max-min+1));
 const attack=roll+(item.isBow?b.rangedDmg:b.meleeDmg)+(b.extraDmg||0),reduction=Math.max(0,(m.dr||0)-p.ignoreDr)+(item.ignHardSkin?0:m.hardSkin||0);
 return Math.max(1,Math.floor(attack*MYTHIC_PROC_RULES.assaultMultiplier)-reduction);
}
export function applyMythicState(skill:MythicProcId,target:Encounter,now:number){
 if(skill!=='lw_dispel_barrier'&&skill!=='lw_reveal')return false;
 target.effects||={};
 if(skill==='lw_dispel_barrier'){
  delete target.effects.holyBarrier;delete target.effects.sk_holy_barrier;
  target.effects.holyBarrierLock={until:Math.max(target.effects.holyBarrierLock?.until||0,now+MYTHIC_PROC_RULES.dispelLockSeconds*1000),value:1};
 }else{
  delete target.effects.invisible;delete target.effects.stealth;
  target.effects.revealed={until:Math.max(target.effects.revealed?.until||0,now+MYTHIC_PROC_RULES.revealSeconds*1000),value:MYTHIC_PROC_RULES.revealAc};
 }
 return true;
}
/** Shared monster barrier state: a configured monster spell can cast it, and Dispel removes it. */
export function applyMonsterHolyBarrier(target:Encounter,now:number,seconds=32,percent=50){
 if(target.effects?.holyBarrierLock?.until!>now)return false;
 target.effects||={};target.effects.holyBarrier={until:now+seconds*1000,value:Math.max(0,Math.min(90,percent))};return true;
}
export function monsterBarrierDamage(target:Encounter,damage:number,now:number,ignorePct=0){
 const barrier=target.effects?.holyBarrier||target.effects?.sk_holy_barrier;
 return barrier?.until!>now&&!(target.effects?.holyBarrierLock?.until!>now)?damage*(1-Math.max(0,Math.min(90,barrier!.value)-Math.max(0,ignorePct))/100):damage;
}

/** Trial lightning uses the existing INT/SP, critical, element resistance and MR proc formula. */
export function mythicLightningDamage(item:any,en:number,b:Record<string,number>,m:any,rng:()=>number){return weaponMagicDamage({ele:'wind',dmgDice:[4,20],dmgBase:40,tier:10},b,lineageWMagicTarget(item,en,m),rng);}
export const MYTHIC_CLEANSE_KEYS=['status_poison','status_slow','status_blind','status_silence'] as const;
