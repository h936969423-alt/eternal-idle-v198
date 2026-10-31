import {cleanGameText} from './game-display-text';
import type {Save,Character} from './engine';
export type GameSyncCursor={character:string;after:number;settingsKey:string};
export type GameSync={settingsKey:string;definitionsIncluded:boolean;deltaCharacter:string|null};
const runtimeKeys=['npcConfig','mapAccess','lootAppearance','dollDefinitions','mapPools','bossGeneration','monsterDefinitions','bossDropDefinitions'] as const;
/** Shared GM definitions are attached before simulation, never duplicated in saves. */
function withoutDefinitions(c:Character):Character{
 const out={...c};for(const key of runtimeKeys)delete out[key];return out;
}
/** Saved combat events only feed the client's replay. Keep what the client has not
 * acknowledged yet (cursor.after) and nothing older than the replay window: the
 * client resets its replay for anything older than 6s anyway. This keeps the row
 * written on every poll small. Same-request lookups use the live save, not this copy. */
export const SAVED_EVENT_WINDOW_MS=15000;
export function persistedSave(s:Save,cursor?:GameSyncCursor,now?:number):Save{return {...s,characters:s.characters.map(c=>{const out=withoutDefinitions(c);if(s.petRosterVersion===1)delete out.pets;
 if(now!==undefined&&out.events?.length){const acked=cursor?.character===c.id&&Number.isSafeInteger(cursor.after)&&cursor.after<=(c.eventSeq||0)?cursor.after:-1;out.events=out.events.filter(e=>e.seq>acked&&e.at>=now-SAVED_EVENT_WINDOW_MS);}
 return out;})};}
export function responseSave(s:Save,settingsKey:string,cursor?:GameSyncCursor){
 const active=s.characters.find(c=>c.id===s.active);
 const reuse=!!active&&cursor?.character===active.id&&cursor.settingsKey===settingsKey;
 const delta=reuse&&Number.isSafeInteger(cursor!.after)&&cursor!.after>=0&&cursor!.after<=(active!.eventSeq||0)&&(active!.eventSeq||0)-cursor!.after<=160;
 const save={...s,characters:s.characters.map(c=>{
  const out=reuse?withoutDefinitions(c):{...c};
  out.logs=c.logs.map(log=>({...log,text:cleanGameText(log.text)}));
  if(delta&&c.id===active!.id)out.events=(c.events||[]).filter(e=>e.seq>cursor!.after);
  return out;
 })};
 return {save,sync:{settingsKey,definitionsIncluded:!reuse,deltaCharacter:delta?active!.id:null} satisfies GameSync};
}
export function mergeGameSave(previous:Save|null,next:Save,sync?:GameSync):Save{
 if(!previous||!sync)return next;
 return {...next,characters:next.characters.map(c=>{
  const old=previous.characters.find(x=>x.id===c.id);if(!old)return c;
  const out={...c};
  if(!sync.definitionsIncluded)for(const key of runtimeKeys){if(old[key]!==undefined)(out as any)[key]=old[key];else delete out[key];}
  if(sync.deltaCharacter===c.id){
   const events=new Map((old.events||[]).map(e=>[e.seq,e]));
   for(const e of c.events||[])events.set(e.seq,e);
   out.events=[...events.values()].sort((a,b)=>a.seq-b.seq).slice(-160);
  }
  return out;
 })};
}
