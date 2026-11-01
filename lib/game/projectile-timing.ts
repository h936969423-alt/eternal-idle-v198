/** Separate arrow cadence from flight time and the spell's cast cooldown. */
export const TRIPLE_SHOT_GAP_MS=70;
export const ARROW_FLIGHT_MS=200;
export const TRIPLE_FLIGHT_MS=ARROW_FLIGHT_MS;
/** Triple Arrow is stored under its Lineage W id (lw_skill_450); older saves and events still use sk_elf_triple. */
export const TRIPLE_ARROW_SKILLS:readonly string[]=['sk_elf_triple','lw_skill_450'];
export function isTripleArrow(skill:string|undefined|null):boolean{return !!skill&&TRIPLE_ARROW_SKILLS.includes(skill);}
