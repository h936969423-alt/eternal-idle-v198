import raw from './gamedata.json';
import {mythicIncomingAmount} from './lineagew-mythic-effects';
import {lineageWEffectDefinition,lineageWEffectProfile} from './lineagew-equipment-effects';
import type {Character} from './engine';
/** Once initialized, swapping cannot refill the shield. */
export function recoverLineageWShield(c:Character,b:Record<string,number>,begin:number,now:number){
 const max=Math.max(0,b.maxShield||0);if(!max){if(c.protectionShield!==undefined)c.protectionShield=0;return;}
 if(c.protectionShield===undefined)c.protectionShield=max;
 c.protectionShield=Math.max(0,Math.min(max,c.protectionShield));
 const ticks=Math.max(0,Math.floor(now/5000)-Math.floor(begin/5000));c.protectionShield=Math.min(max,c.protectionShield+ticks*(1+Math.max(0,b.shieldRegen||0)));
}
export function lineageWIncomingDamage(c:Character,b:Record<string,number>,amount:number,now:number,rng:()=>number,magic=false,source:any={}){
 let damage=Math.max(0,Math.floor(amount)),guarded=false,evaded=false;const mythicEvents:{skill:string;heal?:number;effect:string}[]=[];
 if(damage>0&&magic&&(b.magicEr||0)>0&&rng()*100<Math.min(95,b.magicEr)){damage=0;evaded=true;}
 if(damage>0&&(b.stunDamageReductionPct||0)>0&&c.buffs.status_stun?.until>now)damage=Math.floor(damage*(1-Math.min(95,b.stunDamageReductionPct)/100));
 if(damage>0){const items=raw.items as Record<string,any>;for(const eq of Object.values(c.equipment))for(const proc of lineageWEffectProfile(items[eq.id.split('@')[0]],eq.en)?.rates||[]){
  const def=lineageWEffectDefinition(proc.skill);if(!def||!def.guard&&!def.protection||def.guard&&guarded||rng()*100>=Math.min(100,proc.rate))continue;
  if(def.guard){damage=Math.floor(damage/2);guarded=true;if(proc.skill==='lw_hl_mythic_guard')mythicEvents.push({skill:proc.skill,effect:'神秘防護：本次傷害減半'});}
  if(def.protection==='shield'){c.buffs.lw_osiris_protection={until:now+5000,d:{}};mythicEvents.push({skill:proc.skill,effect:'歐西里斯的加護：5 秒內受到傷害減少 20%'});}
  if(def.protection==='eva'){for(const key of ['status_potionErosion','status_healingErosion','status_pollutedWater'])delete c.buffs[key];const heal=Math.min(Math.max(0,b.maxHp-c.hp),Math.max(1,Math.floor(b.maxHp*.05)));c.hp+=heal;mythicEvents.push({skill:proc.skill,heal,effect:'伊娃的祈禱：回復 5% 最大 HP，解除侵蝕與污濁之水'});}
 }}
 damage=mythicIncomingAmount(c,b,damage,now,magic,source);
 const shield=Math.min(Math.max(0,c.protectionShield||0),Math.max(0,b.maxShield||0)),absorbed=Math.min(shield,damage);if(absorbed){c.protectionShield=shield-absorbed;damage-=absorbed;}
 return {damage,absorbed,guarded,evaded,...(mythicEvents.length?{mythicEvents}:{})};
}
