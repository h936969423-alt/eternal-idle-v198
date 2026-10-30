import {cleanDisplayValue} from './game-display-text';
const cache=new Map<string,{payload:string;revision:number;value:Record<string,any>}>();
/** Re-read revisions from D1 on every request; reuse only unchanged shared JSON.
 * Return a clone so engine/GM mutations cannot leak into another request. */
export function settingsPayload<T extends object=Record<string,any>>(row:{id:string;payload:string;revision:number}):T&{revision:number}{
 let entry=cache.get(row.id);
 if(!entry||entry.revision!==row.revision||entry.payload!==row.payload){
  const value=JSON.parse(row.payload,cleanDisplayValue);
  entry={payload:row.payload,revision:row.revision,value};
  if(!cache.has(row.id)&&cache.size>=8)cache.delete(cache.keys().next().value!);
  cache.set(row.id,entry);
 }
 return {...structuredClone(entry.value),revision:row.revision} as T&{revision:number};
}
