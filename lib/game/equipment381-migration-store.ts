import {parsedSave} from './parsed-save';
import type {Equipment381MigrationSave,Equipment381Validation} from './equipment381-migration';
import {prepareEquipment381Migration,equipment381NeedsMigration,EQUIPMENT381_VERSION} from './equipment381-migration';
/** A successful CAS and its original payload snapshot share the same D1 atomic batch. */
export async function commitEquipment381Migration(db:D1Database,owner:string,row:{payload:string;revision:number},now:number,validation?:Equipment381Validation){
 const original=parsedSave(row) as Equipment381MigrationSave;
 const result=prepareEquipment381Migration(original,now,validation);
 if(!result.changed)return {changed:false,conflict:false,save:original};
 const changes=await db.batch([
  db.prepare('UPDATE game_saves SET payload=?,revision=revision+1,updated_at=? WHERE owner=? AND revision=?').bind(JSON.stringify(result.save),now,owner,row.revision),
  db.prepare('INSERT INTO equipment_catalog_backups (owner,catalog_version,payload,original_revision,created_at) SELECT ?,?,?,?,? WHERE changes()=1 ON CONFLICT(owner,catalog_version) DO NOTHING').bind(owner,EQUIPMENT381_VERSION,row.payload,row.revision,now),
 ]);
 return changes[0].meta.changes?{changed:true,conflict:false,save:result.save}:{changed:false,conflict:true,save:original};
}

/** Every save writer uses this before simulation, including GM grants. */
export async function ensureEquipment381Migration(db:D1Database,owner:string,initial:{payload:string;revision:number},now=Date.now()){
 let row=initial;
 for(let attempt=0;attempt<4;attempt++){
  if(!equipment381NeedsMigration(parsedSave(row)))return row;
  const result=await commitEquipment381Migration(db,owner,row,now);
  if(result.changed)return {payload:JSON.stringify(result.save),revision:row.revision+1};
  const next=await db.prepare('SELECT payload,revision FROM game_saves WHERE owner=?').bind(owner).first<{payload:string;revision:number}>();
  if(!next)throw Error('save not found');row=next;
 }
 throw Error('存檔替換正在同步，請稍後重試');
}

