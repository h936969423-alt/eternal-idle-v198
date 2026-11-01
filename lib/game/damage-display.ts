import type {CombatEvent} from './engine';
import {isTripleArrow} from './projectile-timing';
/** Secondary damage must identify its actual actor instead of resembling a
 * second normal player swing on another monster. */
export function damageSourceLabel(e:CombatEvent){
 if(e.source==='doll')return '娃娃';
 if(e.source==='pet')return '寵物';
 if(e.source==='summon')return '召喚';
 if(e.source==='poison')return '中毒';
 if(e.weaponProc)return e.source==='magic'?'武器魔法':'武器附傷';
 if(e.skill==='sk_counter_barrier')return '反擊';
 // Triple Arrow shots are plain normal attacks: plain red numbers, no caption (afei).
 if(isTripleArrow(e.skill))return undefined;
 if(e.skill)return '技能';
 if(e.source==='magic')return '魔法';
 return undefined;
}
/** Public afei presentation conventions, fed only by confirmed damage events. */
export function damageDisplay(e:CombatEvent){
 const kind=e.miss?'miss':e.source==='pet'?'pet-damage':e.source==='summon'?'summon':e.source==='poison'?'poison':e.source==='doll'||e.source==='magic'||(e.skill&&!['sk_elf_triple','lw_skill_450','sk_dark_crit','sk_shock_stun'].includes(e.skill))?'magic-damage':'physical-damage';
 const prefix=e.source==='magic'||kind==='magic-damage'?'✦ ':'';
 return {kind,text:e.miss?'MISS':`${prefix}-${e.damage??0}${e.critical?'!':''}`};
}

