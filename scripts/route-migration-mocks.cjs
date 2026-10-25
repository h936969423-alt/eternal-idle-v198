// Route tests exercise CAS/action semantics independently of catalog migration.
// Catalog migration is covered by its own regression scripts.
const mocks={};
for(const [file,name] of [['equipment381-migration-store','ensureEquipment381Migration'],['lineagew-migration-store','ensureLineageWMigration'],['lineagew-hl-migration-store','ensureLineageWHLMigration'],['lineagew-mythic-migration-store','ensureLineageWMythicMigration'],['control-ring-restoration-store','ensureControlRingRestoration']]){
 const value={[name]:async(_db,_owner,row)=>row};
 for(const prefix of ['@/lib/game/','../../../lib/game/','../../../../lib/game/'])mocks[prefix+file]=value;
}
module.exports=mocks;
