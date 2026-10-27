import raw from './gamedata.json';
import type {Character} from './engine';

/** Eternal carry rules: bank excluded, equipment already belongs to bag; never delete overflow. */
export function carryLoad(c:Pick<Character,'bag'>,b:Record<string,number>){
 const items=raw.items as Record<string,any>;
 let weight=0;
 for(const [id,count] of Object.entries(c.bag||{})){
  if(!Number.isFinite(count)||count<=0)continue;
  const item=items[id.split('@')[0]];
  if(!item)continue;
  const unit=Number.isFinite(item.weight)?Math.max(0,item.weight):1;
  weight+=unit*count;
 }
 const capacity=Math.max(1,1500+15*(b.str||0)+15*(b.con||0)+(b.weightCap||0));
 const ratio=weight/capacity;
 return {weight,capacity,ratio,regen:ratio>=2?0:ratio>1?.5:1,move:1+Math.min(1,Math.max(0,ratio-1))*.5};
}
