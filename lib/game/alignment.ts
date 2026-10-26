/** Alignment mechanics adapted from the publicly visible Sunrise Empire rules. */
export const ALIGNMENT_MIN=-32767;
export const ALIGNMENT_MAX=32767;
export const ALIGNMENT_EVIL=-1000;
export const ALIGNMENT_JUSTICE=1000;
export function clampAlignment(value:unknown):number{
 const n=Number(value);
 return Math.max(ALIGNMENT_MIN,Math.min(ALIGNMENT_MAX,Math.round(Number.isFinite(n)?n:0)));
}
export function alignmentKind(value:unknown):'evil'|'neutral'|'justice'{
 const n=clampAlignment(value);
 return n<=ALIGNMENT_EVIL?'evil':n>=ALIGNMENT_JUSTICE?'justice':'neutral';
}
/** Healing bonus applies only to justice-aligned casters, up to +20%. */
export function justiceHealMultiplier(value:unknown):number{
 const n=clampAlignment(value);
 return n<ALIGNMENT_JUSTICE?1:1+0.2*(n-ALIGNMENT_JUSTICE)/(ALIGNMENT_MAX-ALIGNMENT_JUSTICE);
}
export function changeAlignment(value:unknown,delta:number):number{
 return clampAlignment(clampAlignment(value)+(Number.isFinite(delta)?delta:0));
}


/** Source: pp771007/idle-lineage-class@5f00f4a, pvpOnKillMob. */
export function alignmentKillDelta(target:{trollPlayer?:boolean;_pvpAlignment?:number;alignmentExempt?:boolean;pledgeEnemy?:boolean;siegeEnemy?:boolean;race?:string;summonedBy?:string}):number{
 if(target.alignmentExempt||target.pledgeEnemy||target.siegeEnemy||target.race==='血盟'||target.summonedBy)return 0;
 if(!target.trollPlayer)return 1;
 const value=clampAlignment(target._pvpAlignment);
 return value>=ALIGNMENT_JUSTICE?-10000:value>ALIGNMENT_EVIL?-5000:0;
}
export function justiceSpellError(skill:{reqJustice?:boolean},value:unknown):string{
 return skill.reqJustice&&clampAlignment(value)<ALIGNMENT_JUSTICE?'需要正義性向（正義值 ≥ 1000）才能施放':'';
}
export function alignmentColor(value:unknown):string{
 const n=clampAlignment(value),t=n>=1000?(n-1000)/31767:n<=-1000?(-n-1000)/31767:0;
 const end=n>=1000?[59,130,246]:[255,77,77];
 return '#'+end.map(x=>Math.round(255+(x-255)*t).toString(16).padStart(2,'0')).join('');
}
