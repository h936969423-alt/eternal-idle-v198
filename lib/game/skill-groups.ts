import {W_SKILLS,W_LEGACY} from './lineagew-skill-data';
/** Player skills that strike with the equipped weapon (attack pose, red physical numbers).
 * Derived from the Lineage W catalogue (type atk + dmgType physical) so a new or edited
 * skill is classified in one place; old ids that map to them are accepted for old events. */
const physicalIds=Object.entries(W_SKILLS).filter(([,s])=>s.type==='atk'&&s.dmgType==='physical').map(([id])=>id);
export const PHYSICAL_PLAYER_SKILLS:ReadonlySet<string>=new Set([...physicalIds,...Object.entries(W_LEGACY).filter(([,id])=>physicalIds.includes(id)).map(([old])=>old)]);
export function isPhysicalSkill(skill:string|undefined|null):boolean{return !!skill&&PHYSICAL_PLAYER_SKILLS.has(skill);}
/** 衝擊之暈 (lw_skill_400, or its retired old id): a failed stun shows 衝暈失敗 on the target. */
export function isShockStun(skill:string|undefined|null):boolean{return !!skill&&(W_LEGACY[skill]||skill)==='lw_skill_400';}
