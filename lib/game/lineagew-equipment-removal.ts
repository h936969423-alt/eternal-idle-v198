import removal from './lineagew-equipment-removal.json';
import type {Save} from './engine';
/** Lineage W gear left the catalog. Held copies with a same-name older item become it and keep their enhancement; the rest are refunded. */
export const LINEAGEW_REMOVAL_VERSION='lineagew-equipment-removed-v1';
const archive=removal.items as Record<string,{n:string;slot?:string;sellP:number}>,replace=removal.replace as Record<string,string>;
export const removedLineageWEquipment=(id:string)=>Object.hasOwn(archive,id.split('@')[0]);
export const lineageWReplacement=(id:string):string|undefined=>{const base=id.split('@')[0];return Object.hasOwn(replace,base)?replace[base]:undefined;};
export function lineageWRemovalNeeded(save:Save){return save.lineageWRemovalVersion!==LINEAGEW_REMOVAL_VERSION;}
export function prepareLineageWRemoval(input:Save,now:number){
 if(!lineageWRemovalNeeded(input))return {changed:false,save:input};
 const save=structuredClone(input);
 for(const c of save.characters){
  c.bag||={};c.bank||={};c.equipment||={};c.enh||={};
  const worn=Object.values(c.equipment).filter(Boolean).map(e=>e.id);
  const keys=new Set([...Object.keys(c.bag),...Object.keys(c.bank),...worn,...Object.keys(c.enh),...Object.keys(c.affixes||{}),...Object.keys(c.darkAffixes||{}),...(c.locked||[]),...(c.autoSell||[])].filter(removedLineageWEquipment));
  let converted=0,refunded=0,gold=0;const names=new Set<string>();
  for(const key of keys){
   const base=key.split('@')[0],dest=lineageWReplacement(key),bag=c.bag[key]||0,bank=c.bank[key]||0,wornCount=worn.filter(id=>id===key).length,copies=Math.max(bag,wornCount)+bank;
   if(dest){
    // A separate key per old stack keeps enhancement and locks; a plain +0 stack merges with what the player already has.
    const plain=key===base&&!c.enh[key]&&!c.affixes?.[key]&&!c.darkAffixes?.[key]&&!wornCount&&!c.locked?.includes(key),target=plain?dest:dest+'@lw2_'+encodeURIComponent(key);
    for(const store of [c.bag,c.bank])if(Object.hasOwn(store,key)){store[target]=(store[target]||0)+store[key];delete store[key];}
    if(Object.hasOwn(c.enh,key)){c.enh[target]=c.enh[key];delete c.enh[key];}
    if(c.affixes?.[key]){c.affixes[target]=c.affixes[key];delete c.affixes[key];}
    if(c.darkAffixes?.[key]){c.darkAffixes[target]=c.darkAffixes[key];delete c.darkAffixes[key];}
    for(const [slot,eq]of Object.entries(c.equipment))if(eq?.id===key)c.equipment[slot]={...eq,id:target};
    c.locked=c.locked?.map(id=>id===key?target:id);c.autoSell=c.autoSell?.filter(id=>id!==key);converted+=copies;
   }else{
    gold+=(archive[base].sellP||0)*copies;refunded+=copies;if(copies)names.add(archive[base].n);
    delete c.bag[key];delete c.bank[key];delete c.enh[key];delete c.affixes?.[key];delete c.darkAffixes?.[key];
    for(const [slot,eq]of Object.entries(c.equipment))if(eq?.id===key)delete c.equipment[slot];
    c.locked=c.locked?.filter(id=>id!==key);c.autoSell=c.autoSell?.filter(id=>id!==key);
   }
   if(c.lastGear?.key===key)delete c.lastGear;
  }
  c.gold=Math.min(Number.MAX_SAFE_INTEGER,c.gold+gold);
  if(converted||refunded){c.logs||=[];c.logs.unshift({time:now,kind:'info',text:`天堂W裝備已下架：${converted} 件換回同名舊裝備並保留強化${refunded?`；${refunded} 件（${[...names].slice(0,3).join('、')}${names.size>3?' 等':''}）回收並退還 ${gold.toLocaleString('zh-TW')} 金幣`:''}`});}
 }
 save.lineageWRemovalVersion=LINEAGEW_REMOVAL_VERSION;
 return {changed:true,save};
}
