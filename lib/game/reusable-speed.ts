import raw from './gamedata.json';
import type {Character} from './engine';
const items=raw.items as Record<string,any>;
const hasteSkills=new Set(['sk_haste_spell','sk_greater_haste','sk_helm_dex2']);
export function legacySpeedStage(id:string){const eff=items[id]?.eff;return eff==='haste'||hasteSkills.has(id)?1:['brave','elfcookie'].includes(eff)?2:0;}
export function activeSpeedStages(c:Character,now:number){return new Set(Object.values(c.buffs).filter(b=>b.until>now&&[1,2,3].includes(b.d.speedStage)).map(b=>b.d.speedStage));}
export function useReusableSpeed(c:Character,id:string,now:number){
 const item=items[id];if(item?.eff!=='reusableSpeed'||![1,2,3].includes(item.speedStage))throw Error('加速道具無效');
 // One active item per tier; replacing it refreshes the timer without spending anything.
 for(const [key,buff] of Object.entries(c.buffs))if(buff.d.speedStage===item.speedStage)delete c.buffs[key];
 c.buffs[id]={until:now+item.dur*1000,d:{speedStage:item.speedStage}};
}
