import archived from './lineagew-mythic-retirement-index.json';
import raw from './gamedata.json';
import type {Save} from './engine';
export const LINEAGEW_MYTHIC_CATALOG_VERSION='lineagew-mythic-v1';
const retired=archived.items as Record<string,any>,mapping=archived.mapping as Record<string,string>,items=raw.items as Record<string,any>;
export type RetiredEquipment={key:string;name:string;bag:number;bank:number;enhancement:number;equipped:Record<string,{id:string;en:number}>;affix?:any;darkAffixes?:any;locked:boolean;autoSell:boolean;reason:string;at:number};
export function lineageWMythicActiveId(id:string):string|undefined{const base=id.split('@')[0];return Object.hasOwn(retired,base)?mapping[base]:items[base]?base:undefined;}
export function lineageWMythicNeedsMigration(save:Save){return save.lineageWMythicCatalogVersion!==LINEAGEW_MYTHIC_CATALOG_VERSION;}
export function prepareLineageWMythicMigration(input:Save,now:number){
 if(!lineageWMythicNeedsMigration(input))return {changed:false,save:input};
 const save=structuredClone(input);
 for(const c of save.characters){
  const keys=new Set([...Object.keys(c.bag||{}),...Object.keys(c.bank||{}),...Object.values(c.equipment||{}).map(e=>e.id),...Object.keys(c.enh||{}),...Object.keys(c.affixes||{}),...Object.keys(c.darkAffixes||{}),...(c.locked||[]),...(c.autoSell||[])]);
  let converted=0,protectedCount=0;
  for(const key of keys){const base=key.split('@')[0],old=retired[base];if(!old)continue;const dest=mapping[base],affix=c.affixes?.[key],dark=c.darkAffixes?.[key],worn=Object.fromEntries(Object.entries(c.equipment).filter(([,e])=>e.id===key));
   // Every old key receives its own deterministic instance; collisions cannot overwrite enhancement or locks.
   const target=dest?dest+'@lwmythic1_'+encodeURIComponent(key):undefined;
   if(target&&!affix&&!dark?.length&&(!items[dest!]?.req||items[dest!].req==='all'||items[dest!].req.split(',').includes(c.cls))){
    for(const inv of [c.bag,c.bank])if(Object.hasOwn(inv,key)){inv[target]=(inv[target]||0)+inv[key];delete inv[key];}
    if(Object.hasOwn(c.enh,key)){c.enh[target]=c.enh[key];delete c.enh[key];}
    for(const [slot,e]of Object.entries(worn))c.equipment[slot]={...e,id:target};
    c.locked=c.locked?.map(id=>id===key?target:id);c.autoSell=c.autoSell?.filter(id=>id!==key);converted++;
   }else{
    c.retiredEquipment||=[];c.retiredEquipment.push({key,name:old.n,bag:c.bag[key]||0,bank:c.bank[key]||0,enhancement:c.enh[key]||Math.max(0,...Object.values(worn).map(e=>e.en)),equipped:worn,affix,darkAffixes:dark,locked:!!c.locked?.includes(key),autoSell:!!c.autoSell?.includes(key),reason:dest?'詞綴不相容，完整保留待處理':'無唯一同名、同部位及職業對應，完整保留待處理',at:now});
    delete c.bag[key];delete c.bank[key];delete c.enh[key];for(const slot of Object.keys(worn))delete c.equipment[slot];c.locked=c.locked?.filter(id=>id!==key);c.autoSell=c.autoSell?.filter(id=>id!==key);protectedCount++;
   }
   if(c.affixes)delete c.affixes[key];if(c.darkAffixes)delete c.darkAffixes[key];if(c.lastGear?.key===key)delete c.lastGear;
  }
  for(const pet of Object.values(c.pets||{}))for(const [slot,e]of Object.entries(pet.gear||{}))if(retired[e.id.split('@')[0]]){c.retiredEquipment||=[];c.retiredEquipment.push({key:e.id,name:retired[e.id.split('@')[0]].n,bag:0,bank:0,enhancement:e.en,equipped:{['寵物 '+slot]:e},locked:false,autoSell:false,reason:'原寵物穿戴裝備，完整保留待處理',at:now});delete pet.gear![slot];}
  for(const target of c.arena||[])migrateDropDefinition(target.definition);
  for(const room of Object.values(c.bossRooms||{}))migrateRoom(room);
  // All running combat pauses while equipment is replaced; no unarmed offline simulation.
  c.running=false;c.atkClock=0;c.events=[];
  if(converted||protectedCount){c.logs.unshift({time:now,text:`天堂 W 神話移植：轉換 ${converted} 組；保留待處理 ${protectedCount} 組，可在背包「舊裝保留」查看。原存檔已完整備份。`,kind:'info'});c.logs=c.logs.slice(0,90);}
 }
 for(const room of Object.values(save.bossRooms||{}))migrateRoom(room);
 save.lineageWMythicCatalogVersion=LINEAGEW_MYTHIC_CATALOG_VERSION;return {changed:true,save};
}

function migrateDropDefinition(def:any){if(!def)return;def.drops=(def.drops||[]).flatMap((d:any)=>{const item=lineageWMythicActiveId(d.item);return item?[{...d,item}]:[];});if(def.hybrid){const ids=[...new Set((def.hybrid.equipmentIds||[]).map(lineageWMythicActiveId).filter(Boolean))];def.hybrid={...def.hybrid,equipmentIds:ids,...(def.hybrid.pool==='custom'&&!ids.length?{pool:'map'}:{})};}}
function migrateRoom(room:any){migrateDropDefinition(room.dropDefinition);for(const target of room.arena||[])migrateDropDefinition(target.definition);}
