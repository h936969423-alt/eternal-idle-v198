import type {Save} from './engine';
export const MAX_CHARACTERS=3;
export const CHARACTER_DELETE_DELAY_MS=10_000;
export type CharacterDeletion={deleteAt:number;token:string};
/** Deadlines are server-owned and survive refresh, disconnect and competing tabs. */
export function settleCharacterDeletions(save:Save,now:number){
 const pending=save.characterDeletions;if(!pending)return;
 const expired=new Set(Object.entries(pending).filter(([,v])=>v.deleteAt<=now).map(([id])=>id));
 save.characters=save.characters.filter(c=>!expired.has(c.id));
 if(save.active&&expired.has(save.active))save.active=null;
 for(const id of Object.keys(pending))if(!save.characters.some(c=>c.id===id))delete pending[id];
 if(!Object.keys(pending).length)delete save.characterDeletions;
}
export function requestCharacterDeletion(save:Save,id:string,now:number){
 const c=save.characters.find(c=>c.id===id);if(!c)throw Error('角色不存在');
 save.characterDeletions||={};
 // Retrying after a lost response must not restart the grace period.
 save.characterDeletions[id]||={deleteAt:now+CHARACTER_DELETE_DELAY_MS,token:crypto.randomUUID()};
}
export function cancelCharacterDeletion(save:Save,id:string,token:string,now:number){
 const pending=save.characterDeletions?.[id];
 if(!pending)return;
 if(pending.token!==token)throw Error('刪除狀態已更新，請重新確認');
 if(now>=pending.deleteAt)throw Error('刪除倒數已結束');
 delete save.characterDeletions![id];
 if(!Object.keys(save.characterDeletions!).length)delete save.characterDeletions;
}
