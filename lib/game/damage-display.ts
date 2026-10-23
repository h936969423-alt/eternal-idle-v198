import type {CombatEvent} from './engine';
/** Public afei presentation conventions, fed only by confirmed damage events. */
export function damageDisplay(e:CombatEvent){
 const kind=e.miss?'miss':e.source==='pet'?'pet-damage':e.source==='summon'?'summon':e.source==='poison'?'poison':e.source==='doll'||e.source==='magic'||(e.skill&&!['sk_elf_triple','sk_dark_crit','sk_shock_stun'].includes(e.skill))?'magic-damage':'physical-damage';
 const prefix=e.source==='magic'||kind==='magic-damage'?'✦ ':'';
 return {kind,text:e.miss?'MISS':`${prefix}-${e.damage??0}${e.critical?'!':''}`};
}
