import raw from './gamedata.json';
import {W_SKILLS,canonicalWSkill} from './lineagew-skill-data';
import {spellClockKey} from './spell-rules';
import type {Character} from './engine';

export function skillCooldownMs(c:Character,input:string,b:Record<string,number>,now:number){
 const id=canonicalWSkill(input,c.cls),s=(raw.skills as Record<string,any>)[id];if(!s||s.type==='passive')return 0;
 if(W_SKILLS[id]){let ms=Number(s.lwCooldownMs)||0;if(c.buffs.lw_skill_15977?.until>now&&['lw_skill_380','lw_skill_360','lw_skill_370','lw_skill_11197'].includes(id))ms*=.7;return Math.max(100,ms);}
 if(Number.isFinite(s.cooldownMs))return Math.max(100,s.cooldownMs);
 if(s.darkCrit)return 30000;if(id==='sk_shock_stun')return 6000;if(id==='sk_abs_barrier')return (s.dur+12)*1000;if(s.healCooldownTicks)return s.healCooldownTicks*100;
 return Math.max(100,(s.fixedHeal?b.healIntervalMs:b.castIntervalMs)||1000);
}
export function skillReadyAt(c:Character,input:string){
 const id=canonicalWSkill(input,c.cls),s=(raw.skills as Record<string,any>)[id];if(!s)return 0;
 const channel=W_SKILLS[id]?(s.type==='atk'?'attack':s.type==='heal'?'heal':s.type==='convert'?'convert':'w-support'):spellClockKey(id,s);
 return Math.max(c.skillCooldowns?.[id]||0,channel?c.spellCooldowns?.[channel]||0:0,id==='sk_magic_shield'?c.magicBarrierCooldown||0:0);
}
export function cooldownSeconds(ms:number){return String(Number((Math.max(0,ms)/1000).toFixed(3)));}
export function remainingCooldownSeconds(ms:number){return ms>=1000?String(Math.ceil(ms/1000)):cooldownSeconds(Math.ceil(Math.max(0,ms)/100)*100);}
export function isSkillCooldownFailure(error:unknown):error is Error{return error instanceof Error&&(error as Error&{skillCooldownApplied?:boolean}).skillCooldownApplied===true;}
/** Reserve only a ready, learned active-skill attempt. Failures retain this timer. */
export function withSkillCooldown<T>(c:Character,input:string,b:Record<string,number>,now:number,cast:()=>T):T{
 if(skillReadyAt(c,input)>now)throw Object.assign(Error('施法冷卻中'),{skillCooldownApplied:true});
 const id=canonicalWSkill(input,c.cls),until=now+skillCooldownMs(c,id,b,now);
 try{return cast();}catch(error){if(error instanceof Error)(error as Error&{skillCooldownApplied?:boolean}).skillCooldownApplied=true;throw error;}
 finally{c.skillCooldowns||={};c.skillCooldowns[id]=Math.max(c.skillCooldowns[id]||0,until);}
}
