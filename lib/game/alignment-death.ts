import {clampAlignment} from './alignment';
export type AlignmentLoss={at:number;id:string;en:number;affix?:unknown;darkAffixes?:unknown;slot?:string};
type Inventory={lawful?:number;bag:Record<string,number>;equipment:Record<string,{id:string;en:number}>;enh:Record<string,number>;locked?:string[];affixes?:Record<string,any>;darkAffixes?:Record<string,any>;alignmentLosses?:AlignmentLoss[]};
/** Equipped items are also counted in bag in Eternal; never put them in the pool twice. */
export function chaoticDeathLoss(c:Inventory,items:Record<string,any>,at:number,rng:()=>number,siege=false):AlignmentLoss|undefined{
 if(siege||clampAlignment(c.lawful)>=-10000)return;
 if(rng()>=.01)return;
 const candidates=Object.keys(c.bag).filter(id=>{const item=items[id];return c.bag[id]>0&&item&&!c.locked?.includes(id)&&!item.noSell&&!item.noJunk;});
 if(!candidates.length)return;
 const id=candidates[Math.min(candidates.length-1,Math.max(0,Math.floor(rng()*candidates.length)))];
 const slots=Object.keys(c.equipment).filter(slot=>c.equipment[slot].id===id);
 // Remove a spare copy first; otherwise remove exactly one equipped copy.
 const slot=c.bag[id]<=slots.length?slots[slots.length-1]:undefined;
 const lost:AlignmentLoss={at,id,en:slot?c.equipment[slot].en:c.enh[id]||0,slot,affix:structuredClone(c.affixes?.[id]),darkAffixes:structuredClone(c.darkAffixes?.[id])};
 if(slot)delete c.equipment[slot];
 if(--c.bag[id]<=0)delete c.bag[id];
 c.alignmentLosses=[...(c.alignmentLosses||[]),lost].slice(-5);
 return lost;
}
