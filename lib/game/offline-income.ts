import type {Save} from './engine';
export type OfflineIncomeReceipt={id:string;settledAt:number;seconds:number;kills:number;gold:number;xp:number;drops:Record<string,number>;characterName:string;characterId?:string;seen:boolean;effectiveMinutes?:number;isDead?:boolean;grossGold?:number;potionCost?:number;potions?:Record<string,{used:number;bought:number;fromBag:number}>;efficiency?:number;reason?:string};
/** A receipt only records income that the simulation has already awarded. */
export function rememberOfflineIncome(save:Save,report:{offline:boolean;pendingSeconds:number;seconds:number;kills:number;gold:number;xp?:number;drops?:Record<string,number>;characterName?:string;characterId?:string;effectiveMinutes?:number;isDead?:boolean;grossGold?:number;potionCost?:number;potions?:Record<string,{used:number;bought:number;fromBag:number}>;efficiency?:number;reason?:string},settledAt:number){
 if(!report.offline||report.pendingSeconds||report.seconds<60)return;
 if(save.offlineIncome?.settledAt===settledAt)return;
 save.offlineIncome={id:crypto.randomUUID(),settledAt,seconds:report.seconds,kills:report.kills,gold:report.gold,xp:report.xp||0,drops:{...(report.drops||{})},characterName:report.characterName||'冒險者',characterId:report.characterId,effectiveMinutes:report.effectiveMinutes,isDead:report.isDead,grossGold:report.grossGold,potionCost:report.potionCost,potions:report.potions?structuredClone(report.potions):undefined,efficiency:report.efficiency,reason:report.reason,seen:false};
}
export function unreadOfflineIncome(save:Save,closedId?:string){if(save.catchup)return null;const r=save.offlineIncome;return r&&!r.seen&&r.id!==closedId?r:null;}
export function acknowledgeOfflineIncome(save:Save,id:unknown){if(typeof id==='string'&&save.offlineIncome?.id===id)save.offlineIncome.seen=true;}


