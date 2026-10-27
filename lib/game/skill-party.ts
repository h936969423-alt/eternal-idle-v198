import type {Character} from './engine';
export type PartySkillBuff={until:number;d:Record<string,number>};
export type PartySkillState={hp:number;maxHp:number;skillBuffs?:Record<string,PartySkillBuff>;skillBaseMaxHp?:number};
export function shareSkillBuff(members:PartySkillState[],id:string,buff:PartySkillBuff,now:number){
 for(const member of members){if(member.hp<=0)continue;member.skillBuffs||={};member.skillBuffs[id]=structuredClone(buff);syncPartyHealth(member,now);}
}
export function partySkillStats(member:Pick<PartySkillState,'skillBuffs'>,now:number){
 const result:Record<string,number>={};
 for(const buff of Object.values(member.skillBuffs||{}))if(buff.until>now)for(const [key,value] of Object.entries(buff.d))result[key]=(result[key]||0)+value;
 return result;
}
export function syncPartyHealth(member:PartySkillState,now:number){
 if(!member.skillBuffs)return;
 member.skillBaseMaxHp??=member.maxHp;
 const stats=partySkillStats(member,now);
 member.maxHp=Math.max(1,Math.floor(member.skillBaseMaxHp*(1+(stats.maxHpPct||0)/100)));
 member.hp=Math.min(member.hp,member.maxHp);
 for(const [id,buff] of Object.entries(member.skillBuffs))if(buff.until<=now)delete member.skillBuffs[id];
}
export function partySkillDamage(member:PartySkillState,amount:number,now:number){
 syncPartyHealth(member,now);const stats=partySkillStats(member,now);
 let damage=Math.max(0,Math.floor(amount*(1-Math.min(100,stats.damageReductionPct||0)/100)));
 for(const buff of Object.values(member.skillBuffs||{}))if(buff.until>now&&buff.d.lwShieldRemaining>0){const absorbed=Math.min(damage,buff.d.lwShieldRemaining);damage-=absorbed;buff.d.lwShieldRemaining-=absorbed;}
 return damage;
}
export function partyMembers(c:Character){return [...(c.summonContract?.entities||[]),...(c.petActives||(c.petActive?[c.petActive]:[])).map(name=>c.pets?.[name]).filter(Boolean)].filter(m=>(m?.hp||0)>0) as PartySkillState[];}
