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
