import './lineagew-skill-data';
import raw from './gamedata.json';
import registry from './dragon381-registry.json';
import {itemRarity,type LootAppearanceConfig} from './loot-appearance';
import {isProgressionEquipment} from './equipment-ranks';

export const FOUR_DRAGON_REWARDS=[
 {rank:'advanced',chance:80,min:1,max:8,books:true},
 {rank:'rare',chance:40,min:1,max:5,books:true},
 {rank:'hero',chance:10,min:1,max:2,books:true},
] as const;
const zones=new Set(registry.map(r=>r.zone));
const items=raw.items as Record<string,any>;
export function isFourDragonZone(zone:string){return zones.has(zone)||['antaras_lair','fafurion_lair','valakas_lair','lindvior_lair'].includes(zone);}
export function isDragonRewardItem(item:any){return isProgressionEquipment(item)||item?.type==='skillbk';}
export function fourDragonPools(appearance?:LootAppearanceConfig,now=Date.now()){
 const catalog=Object.entries(items);
 return FOUR_DRAGON_REWARDS.map(rule=>({...rule,items:catalog.filter(([id,item])=>
  (isProgressionEquipment(item)||rule.books&&item.type==='skillbk')&&
  (!item.availFrom||item.availFrom<=now)&&itemRarity(id,appearance)===rule.rank
 ).map(([id])=>id)}));
}
/** One independent roll per tier per completed encounter; picks may repeat. */
export function rollFourDragonLoot(zone:string,appearance:LootAppearanceConfig|undefined,rng:()=>number,now=Date.now()){
 if(!isFourDragonZone(zone))return [];
 const result=new Map<string,number>();
 for(const group of fourDragonPools(appearance,now)){
  if(!group.items.length||rng()>=group.chance/100)continue;
  const count=group.min+Math.min(group.max-group.min,Math.floor(rng()*(group.max-group.min+1)));
  for(let n=0;n<count;n++){const id=group.items[Math.min(group.items.length-1,Math.floor(rng()*group.items.length))];result.set(id,(result.get(id)||0)+1);}
 }
 return [...result].map(([item,quantity])=>({item,quantity}));
}
