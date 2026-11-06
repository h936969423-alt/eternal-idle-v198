/** Landscape quick bar: seven slots, each holding one skill or one usable item. Stored on the character. */
export type HotbarSlot={k:'s'|'i';id:string}|null;
export const HOTBAR_SIZE=7;
const ID=/^[A-Za-z0-9_:-]{1,80}$/;
/** Keeps exactly seven slots and drops anything malformed, so a bad request can never break a save. */
export function sanitizeHotbar(value:unknown):HotbarSlot[]{
 const list=Array.isArray(value)?value:[];
 return Array.from({length:HOTBAR_SIZE},(_,i)=>{const v=list[i] as {k?:unknown;id?:unknown}|null|undefined;return v&&(v.k==='s'||v.k==='i')&&typeof v.id==='string'&&ID.test(v.id)?{k:v.k,id:v.id}:null;});
}
type ItemInfo={type?:string;eff?:string}|undefined;
const SCROLL_EFFECTS=['poly','magicbarrier'];
/** The request a quick-bar item sends, or null when the item cannot sit on the bar. */
export function hotbarItemAction(item:ItemInfo):'potion'|'useScroll'|null{
 if(!item)return null;if(item.type==='pot')return 'potion';
 if(item.type==='scroll'&&SCROLL_EFFECTS.includes(item.eff||''))return 'useScroll';
 return null;
}
export const DEFAULT_HOTBAR_ITEMS=['potion_heal','potion_strong','potion_ult','scroll_poly'];
/** Before the player arranges anything: the first castable skills, then the usual supplies. */
export function defaultHotbar(skills:string[]):HotbarSlot[]{
 const items=DEFAULT_HOTBAR_ITEMS.map(id=>({k:'i' as const,id})),room=HOTBAR_SIZE-items.length;
 const chosen=skills.slice(0,room).map(id=>({k:'s' as const,id}));
 return sanitizeHotbar([...chosen,...Array.from({length:room-chosen.length},()=>null),...items]);
}
export function resolveHotbar(saved:unknown,skills:string[]):HotbarSlot[]{return Array.isArray(saved)?sanitizeHotbar(saved):defaultHotbar(skills);}
export function placeInHotbar(slots:HotbarSlot[],index:number,slot:HotbarSlot):HotbarSlot[]{
 const next=sanitizeHotbar(slots);if(index<0||index>=HOTBAR_SIZE)return next;
 if(slot)for(let i=0;i<HOTBAR_SIZE;i++)if(i!==index&&next[i]?.k===slot.k&&next[i]?.id===slot.id)next[i]=null;
 next[index]=slot;return next;
}
type SkillInfo={type?:string;mp?:number}|undefined;
/** SELF casts the strongest healing spell the player can cast; stronger heals cost more mana. */
export function selfHealSkill(castable:string[],skills:Record<string,SkillInfo>):string|undefined{
 return castable.filter(id=>skills[id]?.type==='heal').sort((a,b)=>(skills[b]?.mp||0)-(skills[a]?.mp||0))[0];
}
/** Next living monster after the current target, wrapping around; undefined when none other is alive. */
export function nextTargetSlot(hp:number[],current:number):number|undefined{
 for(let step=1;step<=hp.length;step++){const slot=(current+step)%hp.length;if(hp[slot]>0&&slot!==current)return slot;}
 return undefined;
}
