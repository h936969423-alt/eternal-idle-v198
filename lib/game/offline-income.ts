import type {Save} from './engine';
export type OfflineIncomeReceipt={id:string;settledAt:number;seconds:number;kills:number;gold:number;xp:number;drops:Record<string,number>;characterName:string;seen:boolean};
/** A receipt only records income that the simulation has already awarded. */
export function rememberOfflineIncome(save:Save,report:{offline:boolean;pendingSeconds:number;seconds:number;kills:number;gold:number;xp?:number;drops?:Record<string,number>;characterName?:string},settledAt:number){
 if(!report.offline||report.pendingSeconds||report.seconds<60)return;
 if(save.offlineIncome?.settledAt===settledAt)return;
 save.offlineIncome={id:crypto.randomUUID(),settledAt,seconds:report.seconds,kills:report.kills,gold:report.gold,xp:report.xp||0,drops:{...(report.drops||{})},characterName:report.characterName||'冒險者',seen:false};
}
export function unreadOfflineIncome(save:Save,closedId?:string){if(save.catchup)return null;const r=save.offlineIncome;return r&&!r.seen&&r.id!==closedId?r:null;}
export function acknowledgeOfflineIncome(save:Save,id:unknown){if(typeof id==='string'&&save.offlineIncome?.id===id)save.offlineIncome.seen=true;}
