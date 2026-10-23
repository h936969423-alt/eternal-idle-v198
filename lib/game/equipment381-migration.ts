import activation from './equipment381-activation.json';
import legacyIds from './equipment381-legacy-ids.json';
import type {Save} from './engine';
import {equipment381Drops} from './equipment381-settings';
export const EQUIPMENT381_VERSION='apang381-equipment-v1';
export type Equipment381Validation={enabled:boolean;total:number;sourceSha256:string;sourceFieldParity:boolean;inventoryGraphics:boolean};
export type Equipment381MigrationSave=Save&{equipmentCatalogVersion?:string;equipmentMigration?:{version:string;at:number;removed:number;characters:{id:string;removed:number}[]}};
const legacy=new Set(legacyIds);
const retired=(id:string)=>legacy.has(id.split('@')[0]);
export function equipment381NeedsMigration(save:Equipment381MigrationSave){return save.equipmentCatalogVersion!==EQUIPMENT381_VERSION;}
/** Activation is separate from full parity: the user authorized replacement with disclosed gaps. */
export function assertEquipment381Ready(validation:Equipment381Validation=activation){
 if(!validation.enabled||validation.total!==2248||validation.sourceSha256!==activation.sourceSha256||!validation.sourceFieldParity||!validation.inventoryGraphics)throw Error('3.81裝備數值與背包圖示核對尚未通過，禁止清除舊裝備');
}
export function prepareEquipment381Migration(input:Equipment381MigrationSave,now:number,validation:Equipment381Validation=activation){
 assertEquipment381Ready(validation);
 if(!equipment381NeedsMigration(input))return {changed:false,save:input,backup:null};
 const backup=JSON.stringify(input),save=structuredClone(input),characters:{id:string;removed:number}[]=[];
 for(const c of save.characters){let removed=0;
  for(const inventory of [c.bag,c.bank])for(const [id,count]of Object.entries(inventory||{}))if(retired(id)){removed+=count;delete inventory[id];}
  for(const [slot,e]of Object.entries(c.equipment||{}))if(retired(e.id))delete c.equipment[slot];
  for(const records of [c.enh,c.affixes,c.darkAffixes])if(records)for(const id of Object.keys(records))if(retired(id))delete records[id];
  c.locked=c.locked?.filter(id=>!retired(id));c.autoSell=c.autoSell?.filter(id=>!retired(id));
  if(c.lastGear&&retired(c.lastGear.key))delete c.lastGear;
  for(const pet of Object.values(c.pets||{}))for(const [slot,e]of Object.entries(pet.gear||{}))if(retired(e.id))delete pet.gear![slot];
  for(const room of Object.values(c.bossRooms||{}))if(room.dropDefinition)room.dropDefinition={...room.dropDefinition,drops:equipment381Drops(room.dropDefinition.drops)};
  c.events=[];
  c.logs||=[];c.logs.unshift({time:now,text:'裝備庫已替換為阿胖 3.81：舊裝備已清除，原存檔已備份。請重新穿戴後開始狩獵。',kind:'info'});c.logs.length=Math.min(c.logs.length,60);
  // Do not resume an unarmed character's combat during the one-time switch.
  c.running=false;c.atkClock=0;characters.push({id:c.id,removed});
 }
 for(const room of Object.values(save.bossRooms||{}))if(room.dropDefinition)room.dropDefinition={...room.dropDefinition,drops:equipment381Drops(room.dropDefinition.drops)};
 save.equipmentCatalogVersion=EQUIPMENT381_VERSION;save.equipmentMigration={version:EQUIPMENT381_VERSION,at:now,removed:characters.reduce((n,c)=>n+c.removed,0),characters};
 return {changed:true,save,backup};
}
