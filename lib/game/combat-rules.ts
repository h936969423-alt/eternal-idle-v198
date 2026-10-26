import raw from './gamedata.json';
// Public effect names and durations, with explicit local formulas where the server formula is unavailable.
export const SPECIAL_BUFFS:Record<string,Record<string,number>>={};
export const TARGET_EFFECTS:Record<string,{key:string;seconds:number;value:number}>={sk_poison_curse:{key:'poison',seconds:12,value:5},sk_shock_stun:{key:'stun',seconds:3,value:1},sk_sleep_mist:{key:'sleep',seconds:5,value:1},sk_slow:{key:'slow',seconds:20,value:50},sk_elf_groundtrap:{key:'slow',seconds:20,value:50},sk_dark_armorbreak:{key:'vulnerable',seconds:20,value:20},sk_weaken:{key:'weak',seconds:20,value:20},sk_disease:{key:'noRegen',seconds:20,value:1},sk_break:{key:'weak',seconds:20,value:20},sk_dark_blind:{key:'blind',seconds:20,value:20},sk_dark_shadow:{key:'blind',seconds:20,value:20},sk_seal:{key:'silence',seconds:10,value:1},sk_elf_magicerase:{key:'mrDown',seconds:10,value:30},sk_mummy_curse:{key:'stun',seconds:3,value:1}};
export const AREA_SKILLS=new Set(Object.entries(raw.skills as Record<string,any>).filter(([,s])=>s.target==='all').map(([id])=>id));
export function skillElement(id:string){return (raw.skills as Record<string,any>)[id]?.ele||'none';}
export function resistanceDamage(damage:number,mr:number,resistance=0,flat=0){return Math.max(0,Math.floor(damage*(1-Math.max(0,Math.min(100,mr))*.005)*(1-Math.max(0,Math.min(100,resistance))/100)-Math.max(0,flat)));}
export function specialSkillSupported(id:string,type:string){return (raw.skills as Record<string,any>)[id]!==undefined;}

