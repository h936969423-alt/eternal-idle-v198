import {prepareSkillIdMigration,skillIdsNeedMigration,SKILL_ID_VERSION} from './skill-id-migration';
/** Backup and CAS update share one atomic D1 batch; a stale writer cannot migrate. */
export async function ensureSkillIdMigration(db:D1Database,owner:string,initial:{payload:string;revision:number},now=Date.now()){
 let row=initial;
 for(let attempt=0;attempt<4;attempt++){
  const original=JSON.parse(row.payload);if(!skillIdsNeedMigration(original))return row;
  const {save}=prepareSkillIdMigration(original),payload=JSON.stringify(save);
  const changes=await db.batch([
   db.prepare('UPDATE game_saves SET payload=?,revision=revision+1,updated_at=? WHERE owner=? AND revision=?').bind(payload,now,owner,row.revision),
   db.prepare('INSERT INTO equipment_catalog_backups (owner,catalog_version,payload,original_revision,created_at) SELECT ?,?,?,?,? WHERE changes()=1 ON CONFLICT(owner,catalog_version) DO NOTHING').bind(owner,SKILL_ID_VERSION,row.payload,row.revision,now),
  ]);
  if(changes[0].meta.changes)return {payload,revision:row.revision+1};
  const next=await db.prepare('SELECT payload,revision FROM game_saves WHERE owner=?').bind(owner).first<{payload:string;revision:number}>();if(!next)throw Error('save not found');row=next;
 }
 throw Error('技能資料正在同步，請稍後重試');
}
