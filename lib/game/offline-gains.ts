/** Test-stage rates. VIP/month-card status deliberately does not participate. */
export type OfflineEfficiency={expPerMin:number;goldPerMin:number;deathChancePerHour:number};
export const MAX_OFFLINE_SECONDS=24*60*60;
export const DEFAULT_OFFLINE_EFFICIENCY:OfflineEfficiency={expPerMin:100,goldPerMin:50,deathChancePerHour:0};
export const MAP_EFFICIENCY:Record<string,OfflineEfficiency>={
 talking_island:{expPerMin:100,goldPerMin:50,deathChancePerHour:0},
 dragon_valley:{expPerMin:800,goldPerMin:500,deathChancePerHour:.05},
};
/** Constant work regardless of duration; no per-second/minute combat replay. */
export function calculateOfflineGains(seconds:number,rate:OfflineEfficiency,rng:()=>number=Math.random){
 if(!Number.isFinite(seconds)||!Number.isFinite(rate.expPerMin)||rate.expPerMin<0||!Number.isFinite(rate.goldPerMin)||rate.goldPerMin<0||!Number.isFinite(rate.deathChancePerHour)||rate.deathChancePerHour<0||rate.deathChancePerHour>=1)throw Error('無效的離線收益設定');
 const offlineSeconds=Math.min(MAX_OFFLINE_SECONDS,Math.max(0,Math.floor(seconds)));
 let activeSeconds=offlineSeconds,isDead=false;
 if(rate.deathChancePerHour>0&&offlineSeconds>=60){
  const u=rng();if(!Number.isFinite(u)||u<0||u>=1)throw Error('無效的離線亂數');
  const deathAfter=-Math.log1p(-u)/(-Math.log1p(-rate.deathChancePerHour)/3600);
  if(deathAfter<activeSeconds){activeSeconds=deathAfter;isDead=true;}
 }
 const effectiveMinutes=Math.floor(activeSeconds/60);
 return {offlineSeconds,effectiveMinutes,isDead,xp:Math.floor(effectiveMinutes*rate.expPerMin),gold:Math.floor(effectiveMinutes*rate.goldPerMin)};
}
