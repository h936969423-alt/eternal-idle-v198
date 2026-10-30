/** Arithmetic offline hunting adapted from idle-lineage-class v20260825-1924,
 * js/27-offline-rewards.js. All observations are server-owned combat results. */
export const OFFLINE_MIN_SECONDS=60;
export const MAX_OFFLINE_SECONDS=12*60*60;
export const OFFLINE_EFFICIENCY=.70;
export type HuntProfile={zone:string;key:string;sampleMs:number;kills:number;xp:number;gold:number;damage:number;healing:number;potionHealing:number;potions:Record<string,number>;mobs:Record<string,number>;minHpPct:number;deaths:number;lastKillAt:number;updatedAt:number};
export function newHuntProfile(zone:string,key:string,now:number):HuntProfile{return {zone,key,sampleMs:0,kills:0,xp:0,gold:0,damage:0,healing:0,potionHealing:0,potions:{},mobs:{},minHpPct:1,deaths:0,lastKillAt:0,updatedAt:now};}
export function eligibleHunt(p:HuntProfile|undefined,zone:string,key:string,lastActive:number){return !!p&&p.zone===zone&&p.key===key&&p.sampleMs>=15000&&p.kills>=3&&p.lastKillAt>0&&lastActive-p.lastKillAt<=300000&&lastActive>=p.lastKillAt;}
export function rewardAmount(total:number,sampleMs:number,combatSeconds:number){return sampleMs>0?Math.max(0,Math.floor(Math.min(Number.MAX_SAFE_INTEGER,Math.max(0,total)*combatSeconds*1000/sampleMs)+1e-7)):0;}
export function planOfflineHunt(p:HuntProfile,seconds:number,input:{hp:number;maxHp:number;potions:Record<string,{stock:number;price:number;buy:boolean}>;gold:number},rng:()=>number){
 const elapsed=Math.min(MAX_OFFLINE_SECONDS,Math.max(0,Math.floor(seconds)));
 const result={seconds:elapsed,activeSeconds:0,combatSeconds:0,xp:0,gold:0,kills:0,isDead:false,potionCost:0,potions:{} as Record<string,{used:number;bought:number;fromBag:number}>};
 if(elapsed<OFFLINE_MIN_SECONDS||!(p.sampleMs>=15000)||p.kills<3)return result;
 const sampleMinutes=p.sampleMs/60000,damage=Math.max(0,p.damage)/sampleMinutes,healing=Math.max(0,p.healing)/sampleMinutes,potionHealing=Math.min(healing,Math.max(0,p.potionHealing)/sampleMinutes);
 let combat=elapsed*OFFLINE_EFFICIENCY,hp=Math.max(1,input.hp),deathAt=Infinity,remainingBudget=Math.max(0,Math.floor(input.gold*.8));
 // Allocate a shared budget once: no potion can spend money reserved by another.
 const stock=Object.entries(p.potions).filter(([,n])=>n>0).map(([id,n])=>{
  const supply=input.potions[id]||{stock:0,price:0,buy:false};
  const wanted=rewardAmount(n,p.sampleMs,combat),fromBag=Math.min(wanted,Math.max(0,Math.floor(supply.stock)));
  const bought=supply.buy&&supply.price>0?Math.min(wanted-fromBag,Math.floor(remainingBudget/supply.price)):0;
  remainingBudget-=bought*supply.price;
  return {id,rate:n/sampleMinutes,stock:fromBag+bought,fromBag,price:supply.price};
 });
 // Each stock exhaustion changes available healing; at most one segment per potion.
 const totalPotionRate=stock.reduce((n,x)=>n+x.rate,0),segments=[0,...stock.map(x=>x.rate?x.stock/x.rate*60:combat),combat].map(x=>Math.min(combat,Math.max(0,x))).sort((a,b)=>a-b);
 for(let i=1;i<segments.length;i++){
  const from=segments[i-1],to=segments[i];if(to<=from)continue;
  const supported=totalPotionRate?stock.filter(x=>x.stock/x.rate*60>from).reduce((n,x)=>n+x.rate,0)/totalPotionRate:0;
  const pressure=damage-(healing-potionHealing+potionHealing*supported),duration=to-from;
  if(pressure>0&&hp*60/pressure<=duration){deathAt=from+hp*60/pressure;break;}
  hp=Math.min(input.maxHp,Math.max(1,hp-pressure*duration/60));
 }
 const rate=p.deaths>0?p.deaths/(p.sampleMs/3600000):p.minHpPct<.35?Math.pow((.35-p.minHpPct)/.35,2)*.05:0;
 if(rate>0){const u=Math.min(1-Number.EPSILON,Math.max(0,rng()));deathAt=Math.min(deathAt,-Math.log1p(-u)*3600/rate);}
 result.isDead=deathAt<=combat;combat=Math.min(combat,deathAt);
 result.activeSeconds=result.isDead?Math.min(elapsed,combat/OFFLINE_EFFICIENCY):elapsed;result.combatSeconds=combat;
 result.xp=rewardAmount(p.xp,p.sampleMs,combat);result.gold=rewardAmount(p.gold,p.sampleMs,combat);result.kills=Math.min(2160000,rewardAmount(p.kills,p.sampleMs,combat));
 for(const x of stock){const used=Math.min(x.stock,rewardAmount(p.potions[x.id],p.sampleMs,combat)),fromBag=Math.min(x.fromBag,used),bought=used-fromBag;result.potions[x.id]={used,fromBag,bought};result.potionCost+=bought*x.price;}
 return result;
}
/** Same bounded binomial strategy as the reference: exact small/rare draws,
 * normal approximation for large expected counts. No loop per offline kill. */
export function offlineBinomial(n:number,p:number,rng:()=>number):number{
 n=Math.max(0,Math.floor(n));p=Math.min(1,Math.max(0,p));if(!n||!p)return 0;if(p===1)return n;
 if(p>.5)return n-offlineBinomial(n,1-p,rng);
 if(n<64){let k=0;for(let i=0;i<n;i++)if(rng()<p)k++;return k;}
 if(n*p<30){let k=0,at=-1;const log=Math.log1p(-p);while(true){at+=1+Math.floor(Math.log(Math.max(Number.MIN_VALUE,1-rng()))/log);if(at>=n)return k;k++;}}
 const u=Math.max(Number.MIN_VALUE,rng()),v=rng(),z=Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
 return Math.min(n,Math.max(0,Math.round(n*p+Math.sqrt(n*p*(1-p))*z)));
}
export function splitOfflineCount(n:number,weights:Record<string,number>,rng:()=>number){
 const rows=Object.entries(weights).filter(([,v])=>Number.isFinite(v)&&v>0),out:Record<string,number>={};let total=rows.reduce((a,[,v])=>a+v,0),left=Math.max(0,Math.floor(n));
 for(let i=0;i<rows.length;i++){const [id,w]=rows[i],count=i===rows.length-1?left:offlineBinomial(left,w/total,rng);if(count)out[id]=count;left-=count;total-=w;}return out;
}
