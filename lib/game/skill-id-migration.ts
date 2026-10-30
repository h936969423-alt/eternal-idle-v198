import {W_LEGACY,W_SKILLS,wBuffModifiers} from './lineagew-skill-data';
import {autoConfig,enabledAutoSkills} from './auto-config';
import type {Save,Character} from './engine';
export const SKILL_ID_VERSION='canonical-skills-v1';
const canonical=(id:string)=>W_LEGACY[id]||id;
const ids=(list:string[])=>[...new Set(list.map(canonical))];
export function skillIdsNeedMigration(save:Save){return save.skillIdVersion!==SKILL_ID_VERSION;}
function clocks(values:Record<string,number>|undefined){if(!values)return values;const result:Record<string,number>={};for(const [id,value]of Object.entries(values)){const key=canonical(id);result[key]=Math.max(result[key]||0,value);}return result;}
function migrateSharedBuffs(member:{skillBuffs?:Record<string,{until:number;d:Record<string,number>}>}){
 for(const old of Object.keys(member.skillBuffs||{})){const id=canonical(old);if(id===old)continue;const buff=member.skillBuffs![old],current=member.skillBuffs![id];if(current)current.until=Math.max(current.until,buff.until);else member.skillBuffs![id]=buff;delete member.skillBuffs![old];}
}
function migrateCharacter(c:Character){
 c.skills=ids(c.skills||[]);
 // Explicit config is authoritative, including an empty/disabled selection.
 c.autoConfig=autoConfig(c);c.autoSkills=enabledAutoSkills(c.autoConfig);
 c.skillCooldowns=clocks(c.skillCooldowns);c.stormClocks=clocks(c.stormClocks);
 for(const [key,until]of Object.entries(c.spellCooldowns||{}))if(key.startsWith('manual:')&&W_LEGACY[key.slice(7)]){c.skillCooldowns||={};const id=canonical(key.slice(7));c.skillCooldowns[id]=Math.max(c.skillCooldowns[id]||0,until||0);delete c.spellCooldowns![key];}
 if(c.spellCooldowns?.purify)for(const [id,skill]of Object.entries(W_SKILLS))if(skill.type==='heal'&&c.skills.includes(id)){c.skillCooldowns||={};c.skillCooldowns[id]=Math.max(c.skillCooldowns[id]||0,c.spellCooldowns.purify||0);}
 for(const member of [...Object.values(c.pets||{}),...(c.summonContract?.entities||[])])migrateSharedBuffs(member);
 const buffs=c.buffs||{};
 for(const old of Object.keys(buffs)){
  const id=canonical(old);if(id===old)continue;const buff=buffs[old],current=buffs[id];
  if(old==='sk_abs_barrier'){
   const lock=buffs.status_action_lock;buffs.status_action_lock={until:Math.max(lock?.until||0,buff.until),d:{}};
  }
  if(W_SKILLS[id]?.type!=='passive'){
   // Preserve the already-active canonical effect; never refill its consumed shield.
   if(current)current.until=Math.max(current.until,buff.until);
   else {const d=wBuffModifiers(c,id);if(d.lwShield)d.lwShieldRemaining=Math.min(d.lwShield,buff.d.lwShieldRemaining??0);buffs[id]={until:buff.until,d};}
  }
  delete buffs[old];
 }
 c.buffs=buffs;
 if(c.healingOverTime)c.healingOverTime.skill=canonical(c.healingOverTime.skill);
 if(c.summons)c.summons.skill=canonical(c.summons.skill);
 // Re-key only the skill-bearing positions in sampled setups. Keep measured income
 // and the original offline timestamp so migration cannot consume offline rewards.
 for(const profile of c.offlineHunt||[]){try{const setup=JSON.parse(profile.key);if(!Array.isArray(setup)||setup.length<6)continue;const sample={...c,skills:setup[3]||[],autoConfig:setup[4],autoSkills:setup[5]||[]} as Character;setup[3]=ids(sample.skills);setup[4]=autoConfig(sample);setup[5]=enabledAutoSkills(setup[4]);profile.key=JSON.stringify(setup);}catch{/* Unknown historical sample formats remain intact. */}}
}
/** Pure conversion. The store must back up the exact input before committing it. */
export function prepareSkillIdMigration(input:Save){
 if(!skillIdsNeedMigration(input))return {changed:false,save:input};
 const save=structuredClone(input);for(const c of save.characters)migrateCharacter(c);for(const member of Object.values(save.petRoster||{}))migrateSharedBuffs(member);
 save.skillIdVersion=SKILL_ID_VERSION;return {changed:true,save};
}
