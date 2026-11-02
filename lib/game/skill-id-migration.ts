import {W_REVERTED,W_REMOVED} from './lineagew-skill-data';
import {autoConfig,enabledAutoSkills} from './auto-config';
import {buffModifiers} from './spell-rules';
import raw from './gamedata.json';
import type {Save,Character} from './engine';
/** v1 (canonical-skills-v1) moved 69 old skills onto Lineage W ids. v2 played those 69 with their old
 * rules, names and ids again and removed the Lineage W ordinary/class skills without an old version.
 * v3 also removes the 潛力 and 攻城 skills. Saves from before v1 already use the old ids. */
export const SKILL_ID_VERSION='legacy-skills-v3';
const skills=raw.skills as Record<string,any>;
const canonical=(id:string)=>W_REVERTED[id]||id;
const removed=(id:string)=>W_REMOVED.has(id);
const ids=(list:string[])=>[...new Set(list.filter(id=>!removed(id)).map(canonical))];
export function skillIdsNeedMigration(save:Save){return save.skillIdVersion!==SKILL_ID_VERSION;}
function clocks(values:Record<string,number>|undefined){if(!values)return values;const result:Record<string,number>={};for(const [id,value]of Object.entries(values)){if(removed(id))continue;const key=canonical(id);result[key]=Math.max(result[key]||0,value);}return result;}
type Buffs=Record<string,{until:number;d:Record<string,number>}>;
/** Re-key active effects; a reverted effect takes its old modifiers (remaining time kept), a removed one ends. */
function migrateBuffs(buffs:Buffs|undefined,lv:number,ele?:string){
 if(!buffs)return;
 for(const key of Object.keys(buffs)){
  if(removed(key)){delete buffs[key];continue;}
  const old=W_REVERTED[key];if(!old)continue;
  const buff=buffs[key],s=skills[old];delete buffs[key];
  // Only an old skill that is itself an effect keeps running (heal/attack/passive versions end).
  if(!s||s.type!=='buff'&&old!=='sk_abs_barrier')continue;
  const d:Record<string,number>=s.type==='buff'?buffModifiers(old,s,lv,ele):{};
  if(old==='sk_abs_barrier')d.invulnerable=1;
  const current=buffs[old];if(current)current.until=Math.max(current.until,buff.until);else buffs[old]={until:buff.until,d};
 }
}
function migrateConfig(cfg:any){
 if(!cfg)return;
 for(const key of ['opener','attack','heal','convert'])if(typeof cfg[key]==='string')cfg[key]=removed(cfg[key])?'':canonical(cfg[key]);
 if(Array.isArray(cfg.buffs))cfg.buffs=ids(cfg.buffs);
}
function migrateCharacter(c:Character){
 c.skills=ids(c.skills||[]);
 // Explicit config is authoritative; removed skills are dropped and reverted ones renamed.
 migrateConfig(c.autoConfig);c.autoConfig=autoConfig(c);c.autoSkills=enabledAutoSkills(c.autoConfig);
 c.skillCooldowns=clocks(c.skillCooldowns);c.stormClocks=clocks(c.stormClocks);
 migrateBuffs(c.buffs,c.lv,c.elfEle);
 for(const member of [...Object.values(c.pets||{}),...(c.summonContract?.entities||[])])migrateBuffs((member as {skillBuffs?:Buffs}).skillBuffs,c.lv,c.elfEle);
 if(c.healingOverTime)c.healingOverTime.skill=canonical(c.healingOverTime.skill);
 if(c.summons)c.summons.skill=canonical(c.summons.skill);
 // Re-key only the skill-bearing positions in sampled setups. Keep measured income
 // and the original offline timestamp so migration cannot consume offline rewards.
 for(const profile of c.offlineHunt||[]){try{const setup=JSON.parse(profile.key);if(!Array.isArray(setup)||setup.length<6)continue;migrateConfig(setup[4]);const sample={...c,skills:ids(setup[3]||[]),autoConfig:setup[4],autoSkills:setup[5]||[]} as Character;setup[3]=sample.skills;setup[4]=autoConfig(sample);setup[5]=enabledAutoSkills(setup[4]);profile.key=JSON.stringify(setup);}catch{/* Unknown historical sample formats remain intact. */}}
}
/** Pure conversion. The store must back up the exact input before committing it. */
export function prepareSkillIdMigration(input:Save){
 if(!skillIdsNeedMigration(input))return {changed:false,save:input};
 const save=structuredClone(input);for(const c of save.characters)migrateCharacter(c);for(const member of Object.values(save.petRoster||{}))migrateBuffs((member as {skillBuffs?:Buffs}).skillBuffs,1);
 save.skillIdVersion=SKILL_ID_VERSION;return {changed:true,save};
}
