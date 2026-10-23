import type {OfflineIncomeReceipt} from './offline-income';
export type OfflineNoticeStorage={getItem:(key:string)=>string|null;setItem:(key:string,value:string)=>void};
export const OFFLINE_NOTICE_KEY='eternal-offline-income-shown-v1';
const LIMIT=64;
const sessionShown=new Set<string>();
function browserStorage(){try{return typeof window==='undefined'?undefined:window.localStorage;}catch{return undefined;}}
/** Claim before scheduling the dialog, so retries and remounts cannot reopen it.
 * Storage contains receipt IDs only; the full report remains in the save for
 * the explicit "offline income" button, even after it was shown automatically.
 */
export function createOfflineIncomeNotices(storage:OfflineNoticeStorage|undefined=browserStorage(),shown=sessionShown){
 const refresh=()=>{try{const ids=JSON.parse(storage?.getItem(OFFLINE_NOTICE_KEY)||'[]');if(Array.isArray(ids))for(const id of ids.slice(-LIMIT))if(typeof id==='string')shown.add(id);}catch{}while(shown.size>LIMIT)shown.delete(shown.values().next().value!);};
 const remember=(id:string)=>{refresh();shown.delete(id);shown.add(id);while(shown.size>LIMIT)shown.delete(shown.values().next().value!);try{storage?.setItem(OFFLINE_NOTICE_KEY,JSON.stringify([...shown]));}catch{}};
 return {remember,claim(receipt:Pick<OfflineIncomeReceipt,'id'|'seen'>|null){if(!receipt||receipt.seen||!receipt.id)return false;refresh();if(shown.has(receipt.id))return false;remember(receipt.id);return true;}};
}
