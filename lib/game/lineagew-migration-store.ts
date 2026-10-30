import {parsedSave} from './parsed-save';
import activation from './lineagew-equipment-activation.json';
import reference from './lineagew-equipment-reference.json';
import {prepareLineageWMigration,lineageWNeedsMigration,LINEAGEW_CATALOG_VERSION} from './lineagew-migration';
/** Exact original payload and successful CAS update commit in the same atomic batch. */
export async function ensureLineageWMigration(db:D1Database,owner:string,initial:{payload:string;revision:number},now=Date.now()){
 if(!activation.enabled||activation.version!==LINEAGEW_CATALOG_VERSION||activation.items!==Object.keys(reference.items).length||activation.icons!==activation.items)throw Error('永夜 裝備清單與圖示尚未完整核對，暫停移植');
 let row=initial;
 for(let attempt=0;attempt<4;attempt++){
  const original=parsedSave(row);if(!lineageWNeedsMigration(original))return row;
  const result=prepareLineageWMigration(original,now),payload=JSON.stringify(result.save);
  const changes=await db.batch([
   db.prepare('UPDATE game_saves SET payload=?,revision=revision+1,updated_at=? WHERE owner=? AND revision=?').bind(payload,now,owner,row.revision),
   db.prepare('INSERT INTO equipment_catalog_backups (owner,catalog_version,payload,original_revision,created_at) SELECT ?,?,?,?,? WHERE changes()=1 ON CONFLICT(owner,catalog_version) DO NOTHING').bind(owner,LINEAGEW_CATALOG_VERSION,row.payload,row.revision,now),
  ]);
  if(changes[0].meta.changes)return {payload,revision:row.revision+1};
  const next=await db.prepare('SELECT payload,revision FROM game_saves WHERE owner=?').bind(owner).first<{payload:string;revision:number}>();if(!next)throw Error('save not found');row=next;
 }
 throw Error('裝備移植正在同步，請稍後重試');
}

