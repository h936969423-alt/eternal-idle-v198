import {W_LEGACY} from './lineagew-skill-data';
import raw from './gamedata.json';
const playerSkills=raw.skills as Record<string,any>;
const physicalIds=Object.entries(playerSkills).filter(([,s])=>s.type==='atk'&&s.dmgType==='physical'&&(s.lwClasses||['reqRoy','reqK','reqE','reqM','reqD'].some(k=>s[k]!==undefined))).map(([id])=>id);
/** Player skills that strike with the equipped weapon (attack pose, red physical numbers), from the
 * skill table itself; Lineage W ids of the same skills are accepted for events from that period. */
export const PHYSICAL_PLAYER_SKILLS:ReadonlySet<string>=new Set([...physicalIds,...Object.entries(W_LEGACY).filter(([old])=>physicalIds.includes(old)).map(([,id])=>id)]);
export function isPhysicalSkill(skill:string|undefined|null):boolean{return !!skill&&PHYSICAL_PLAYER_SKILLS.has(skill);}
/** 衝擊之暈 (sk_shock_stun; its Lineage W id from the W period is accepted too). */
export function isShockStun(skill:string|undefined|null):boolean{return !!skill&&(skill==='sk_shock_stun'||W_LEGACY.sk_shock_stun===skill);}
