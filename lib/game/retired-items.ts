import raw from './gamedata.json';
import type {Save} from './engine';
/** Items removed from the game. Copies still held are taken out and refunded at the normal sell price. */
export const RETIRED_ITEMS:Record<string,string>={afei_drop_wpn_33:'骰子匕首',afei_drop_wpn_14:'闊矛',afei_drop_wpn_16:'戟',afei_drop_wpn_halberd:'法丘'};
export const isRetiredItem=(id:string)=>Object.hasOwn(RETIRED_ITEMS,id.split('@')[0]);
const items=raw.items as Record<string,{p?:number;sellP?:number}>;
const retiredKey=(key:string)=>Object.hasOwn(RETIRED_ITEMS,key.split('@')[0]);
export function retireItems(save:Save,now:number){
 for(const c of save.characters){
  let count=0,gold=0;const removed=new Set<string>();
  const refund=(key:string,n:number)=>{const i=items[key.split('@')[0]];count+=n;gold+=Math.floor(i?.sellP??(i?.p||0)*.25)*n;removed.add(key);};
  for(const store of [c.bag,c.bank])for(const key of Object.keys(store||{}))if(retiredKey(key)){refund(key,store[key]||0);delete store[key];}
  for(const [slot,eq] of Object.entries(c.equipment||{}))if(eq&&retiredKey(eq.id)){refund(eq.id,1);delete c.equipment[slot];}
  if(!removed.size)continue;
  for(const key of removed){delete c.enh?.[key];delete c.affixes?.[key];delete c.darkAffixes?.[key];}
  if(c.locked)c.locked=c.locked.filter(k=>!retiredKey(k));if(c.autoSell)c.autoSell=c.autoSell.filter(k=>!retiredKey(k));
  c.gold+=gold;
  const names=[...new Set([...removed].map(k=>RETIRED_ITEMS[k.split('@')[0]]))].join('、');
  c.logs||=[];c.logs.unshift({time:now,kind:'info',text:`${names} 已從遊戲移除，回收 ${count} 件並退還 ${gold.toLocaleString('zh-TW')} 金幣`});
 }
}
