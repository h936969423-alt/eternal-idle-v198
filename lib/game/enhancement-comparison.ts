import {stats,type Character} from './engine';
import type {EnhancementResult} from './enhancement-result';
import raw from './gamedata.json';
export type EnhancementChange={label:string;before:number;after:number};
export function enhancementChanges(c:Character,result:EnhancementResult,now=Date.now()):EnhancementChange[]{
 if(result.outcome!=='success'||result.to===null)return [];
 const item=(raw.items as Record<string,any>)[result.item];if(!item)return [];
 const equipped=Object.entries(c.equipment).find(([,e])=>e.id===result.key)?.[0]||Object.entries(c.equipment).find(([,e])=>e.id===result.originalKey)?.[0];
 const slot=equipped||(item.type==='wpn'?'weapon':item.slot==='ring'?(!c.equipment.ring?'ring':!c.equipment.ring2?'ring2':'ring'):item.slot==='ear1'?(!c.equipment.ear1?'ear1':!c.equipment.ear2?'ear2':'ear1'):item.slot||'armor');
 const keepsShield=!!stats(c,now).lwTwohandMaster;
 const preview=(en:number)=>{const copy=structuredClone(c);copy.bag[result.key]=Math.max(1,copy.bag[result.key]||0);copy.enh[result.key]=en;copy.equipment[slot]={id:result.key,en};if((item.w2h||item.twohanded)&&!keepsShield)delete copy.equipment.shield;return stats(copy,now);};
 const before=preview(result.from),after=preview(result.to);
 const labels={damageBonus:'傷害加成',hit:'命中',ac:'防禦 AC',mr:'魔防 MR',maxHp:'最大 HP',maxMp:'最大 MP',attackInterval:'攻擊間隔（秒）'} as const;
 return (Object.keys(labels) as (keyof typeof labels)[]).filter(k=>Number.isFinite(before[k])&&Number.isFinite(after[k])&&before[k]!==after[k]).map(k=>({label:labels[k],before:before[k],after:after[k]}));
}
