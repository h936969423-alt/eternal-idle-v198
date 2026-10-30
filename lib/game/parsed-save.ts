import type {Save} from './engine';
type SaveRow={payload:string;revision:number};
// Request-local row identity: never cache a player's state across database reads.
// Migration preparers clone their input before modifying it.
const parsed=new WeakMap<SaveRow,{payload:string;save:Save}>();
export function parsedSave(row:SaveRow):Save{
 const cached=parsed.get(row);
 if(cached?.payload===row.payload)return cached.save;
 const save=JSON.parse(row.payload) as Save;
 parsed.set(row,{payload:row.payload,save});
 return save;
}
