import type {Character} from './engine';
import {newHuntProfile,type HuntProfile} from './offline-hunt';
const samples=new WeakMap<Character,{profile:HuntProfile;hp:number;level:number;maxHp:number;start:number}>();
/** Stable combat setup only: balances, animation clocks and expiry timestamps
 * must not invalidate a sample on every poll. No GM reward enters this ledger. */
export function huntSetupKey(c:Character){return JSON.stringify([c.zone,c.equipment,c.attrs,c.skills,c.autoConfig,c.autoSkills,c.autoPotion,c.potion,c.threshold,c.doll,c.poly?.id,c.petActives,c.petActive,c.summonChoice,c.mapPools?.[c.zone]]);}
export function huntProfile(c:Character){return c.offlineHunt?.find(p=>p.zone===c.zone&&p.key===huntSetupKey(c));}
export function beginHuntSample(c:Character,now:number,maxHp:number){
 const key=huntSetupKey(c);let profile=huntProfile(c);
 if(!profile){profile=newHuntProfile(c.zone,key,now);c.offlineHunt=[profile,...(c.offlineHunt||[]).filter(p=>p.zone!==c.zone)].slice(0,5);}
 samples.set(c,{profile,hp:c.hp,level:c.lv,maxHp,start:now});
}
export function observeHuntHealth(c:Character){const s=samples.get(c);if(!s)return;const delta=c.hp-s.hp;
 if(delta<0)s.profile.damage-=delta;else if(c.lv===s.level)s.profile.healing+=delta;
 s.hp=c.hp;s.level=c.lv;s.profile.minHpPct=Math.min(s.profile.minHpPct,Math.max(0,c.hp/s.maxHp));
}
export function recordHuntPotion(c:Character,id:string,healed:number){const s=samples.get(c);if(!s)return;s.profile.potions[id]=(s.profile.potions[id]||0)+1;s.profile.potionHealing+=Math.max(0,healed);}
export function recordHuntKill(c:Character,id:string,xp:number,gold:number,now:number){const p=samples.get(c)?.profile||huntProfile(c);if(!p)return;p.kills++;p.xp+=Math.max(0,xp);p.gold+=Math.max(0,gold);if(p.mobs[id]!==undefined||Object.keys(p.mobs).length<80)p.mobs[id]=(p.mobs[id]||0)+1;p.lastKillAt=now;}
export function finishHuntSample(c:Character,now:number){const s=samples.get(c);if(!s)return;observeHuntHealth(c);s.profile.sampleMs+=Math.max(0,(c.lastDeathAt&&c.lastDeathAt>=s.start?Math.min(now,c.lastDeathAt):now)-s.start);if(c.lastDeathAt&&c.lastDeathAt>=s.start)s.profile.deaths++;s.profile.updatedAt=now;samples.delete(c);}
