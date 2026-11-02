import type {CombatEvent} from './engine';
// Kept local (no runtime import): tests load this file directly with node --experimental-strip-types.
// scripts/test-skill-groups.cjs asserts these equal skill-groups.ts / projectile-timing.ts.
const TRIPLE_ARROW=new Set(['sk_elf_triple','lw_skill_450']);
/** Counter Barrier (反擊屏障): its retaliation is a physical weapon hit. */
const COUNTER_BARRIER=new Set(['sk_counter_barrier','lw_skill_440']);
/** Same members as PHYSICAL_PLAYER_SKILLS (Lineage W atk + physical, plus their old ids). */
export const PHYSICAL_SKILLS_LOCAL:ReadonlySet<string>=new Set(['lw_skill_710','lw_skill_10288','lw_skill_400','lw_skill_441','lw_skill_10289','lw_skill_13372','lw_skill_450','lw_skill_11615','lw_skill_9620','lw_skill_10818','lw_skill_18129','sk_shock_stun','sk_elf_triple','sk_dark_crit']);
/** Secondary damage must identify its actual actor instead of resembling a
 * second normal player swing on another monster. */
export function damageSourceLabel(e:CombatEvent){
 if(e.source==='doll')return '娃娃';
 if(e.source==='pet')return '寵物';
 if(e.source==='summon')return '召喚';
 if(e.source==='poison')return '中毒';
 if(e.weaponProc)return e.source==='magic'?'武器魔法':'武器附傷';
 if(e.skill&&COUNTER_BARRIER.has(e.skill))return '反擊';
 // Triple Arrow shots are plain normal attacks: plain red numbers, no caption (afei).
 if(e.skill&&TRIPLE_ARROW.has(e.skill))return undefined;
 if(e.skill)return '技能';
 if(e.source==='magic')return '魔法';
 return undefined;
}
/** Public afei presentation conventions, fed only by confirmed damage events. */
export function damageDisplay(e:CombatEvent){
 const kind=e.miss?'miss':e.source==='pet'?'pet-damage':e.source==='summon'?'summon':e.source==='poison'?'poison':e.source==='doll'||e.source==='magic'||(e.skill&&!PHYSICAL_SKILLS_LOCAL.has(e.skill)&&!COUNTER_BARRIER.has(e.skill))?'magic-damage':'physical-damage';
 const prefix=e.source==='magic'||kind==='magic-damage'?'✦ ':'';
 return {kind,text:e.miss?'MISS':`${prefix}-${e.damage??0}${e.critical?'!':''}`};
}

