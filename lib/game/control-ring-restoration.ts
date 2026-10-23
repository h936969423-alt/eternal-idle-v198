import type {Save,Character} from './engine';
export const CONTROL_RING_VERSION='control-rings-restored-v1';
export const CONTROL_RING_IDS=['ap381_armor_20281','ap381_armor_20284'] as const;
export function needsControlRingRestoration(save:Save){return save.controlRingsVersion!==1;}
/** Return archived ownership to inventory without replacing a player's current equipment. */
export function prepareControlRingRestoration(input:Save,now:number){
 if(!needsControlRingRestoration(input))return {changed:false,save:input};
 const save=structuredClone(input);
 for(const c of save.characters){
  const keep:NonNullable<Character['retiredEquipment']>=[];let restored=0;
  for(const [index,entry]of (c.retiredEquipment||[]).entries()){
   const base=entry.key.split('@')[0];if(!CONTROL_RING_IDS.includes(base as typeof CONTROL_RING_IDS[number])){keep.push(entry);continue;}
   const count=(n:number)=>Number.isSafeInteger(n)&&n>0?n:0;
   const bank=count(entry.bank),bag=Math.max(count(entry.bag),Object.keys(entry.equipped||{}).length);
   // Keep metadata-only records in the protected view; never mint an unowned item.
   if(!bag&&!bank){keep.push(entry);continue;}
   const prefix=base+'@control_restore_'+index+'_'+encodeURIComponent(entry.key);let key=prefix,suffix=0;
   while(Object.hasOwn(c.bag,key)||Object.hasOwn(c.bank,key)||Object.hasOwn(c.enh,key)||Object.values(c.equipment).some(eq=>eq.id===key))key=prefix+'_'+(++suffix);
   if(bag)c.bag[key]=bag;if(bank)c.bank[key]=bank;
   c.enh[key]=Math.max(0,entry.enhancement||0,...Object.values(entry.equipped||{}).map(eq=>eq.en||0));
   if(entry.affix){c.affixes||={};c.affixes[key]=structuredClone(entry.affix);}
   if(entry.darkAffixes?.length){c.darkAffixes||={};c.darkAffixes[key]=structuredClone(entry.darkAffixes);}
   if(entry.locked){c.locked||=[];c.locked.push(key);}
   c.restoredControlRings||=[];c.restoredControlRings.push({key,from:structuredClone(entry),at:now});restored++;
  }
  if(c.retiredEquipment)c.retiredEquipment=keep;
  if(restored){c.logs.unshift({time:now,text:`已補回 ${restored} 組控制戒指，可在背包／倉庫查看。原數量、強化、詞綴與鎖定已保留，原存檔已備份。`,kind:'info'});c.logs=c.logs.slice(0,90);}
 }
 save.controlRingsVersion=1;return {changed:true,save};
}
