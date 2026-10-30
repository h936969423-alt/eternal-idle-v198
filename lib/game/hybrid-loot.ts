import raw from './gamedata.json';
import {itemRarity,ITEM_RARITY_OPTIONS,type LootAppearanceConfig} from './loot-appearance';
import {isProgressionEquipment} from './equipment-ranks';
import {PUBLIC_LOOT,PUBLIC_DROP_RATES} from './monster-loot';
import {bossRoomDrops} from './boss-loot';
import {offlineBinomial,splitOfflineCount} from './offline-hunt';
export {isProgressionEquipment} from './equipment-ranks';
export type DropRank=typeof ITEM_RARITY_OPTIONS[number];
export type HybridRole='normal'|'elite'|'boss'|'world';
export type HybridRule={role:HybridRole;equipmentChance:number;weights:Record<DropRank,number>;pool:'map'|'custom';equipmentIds:string[];pityKills:number;legendShardChance:number;mythicShardChance:number};
export type PityRecord={signature:string;misses:number};
const items=raw.items as Record<string,any>,mobs=raw.mobs as Record<string,any>,maps=raw.maps as Record<string,string[]>;
const ranks=ITEM_RARITY_OPTIONS;
const standard=Object.keys(items).filter(id=>isProgressionEquipment(items[id])&&['apang381','lineagew'].includes(items[id].source)&&items[id].p>0&&!items[id].noSell);
export function defaultHybridRule(lv:number,role:HybridRole='normal'):HybridRule{
 const weights=Object.fromEntries(ranks.map(r=>[r,0])) as Record<DropRank,number>;
 const distribution:Partial<Record<DropRank,number>>=role==='world'?{hero:89,legend:10.99,mythic:.01}:role==='boss'?{hero:95,legend:5}:lv<30?{normal:90,advanced:10}:lv<45?{normal:20,advanced:75,rare:5}:lv<55?{advanced:60,rare:39,hero:1}:lv<65?{rare:90,hero:10}:lv<75?{rare:70,hero:30}:{rare:50,hero:49,legend:1};
 Object.assign(weights,distribution);if(role==='elite'){const top=ranks.filter(r=>weights[r]>0).at(-1)!;weights[top]*=2;}
 return {role,equipmentChance:role==='normal'?3:role==='elite'?8:100,weights,pool:'map',equipmentIds:[],pityKills:role==='normal'?300:role==='elite'?80:0,legendShardChance:role==='world'||role==='boss'?100:lv>=55?(role==='elite'?2:.5):0,mythicShardChance:role==='world'?100:role==='boss'?.1:0};
}
function finite(value:unknown,min:number,max:number,integer=false){if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max||integer&&!Number.isInteger(value))throw Error(`混合掉落數值需為 ${min}–${max}${integer?' 整數':''}`);return value;}
export function validateHybridRule(input:any):HybridRule{
 if(!input||!['normal','elite','boss','world'].includes(input.role)||!['map','custom'].includes(input.pool))throw Error('混合掉落設定無效');
 const weights=Object.fromEntries(ranks.map(r=>[r,finite(input.weights?.[r],0,1000000)])) as Record<DropRank,number>;
 if(!Object.values(weights).some(n=>n>0))throw Error('至少一種分類權重需大於 0');
 if(!Array.isArray(input.equipmentIds)||input.equipmentIds.length>500||input.equipmentIds.some((id:unknown)=>typeof id!=='string'||!isProgressionEquipment(items[id])))throw Error('指定裝備清單無效（最多 500 件）');
 const equipmentIds=[...new Set(input.equipmentIds)] as string[];if(input.pool==='custom'&&!equipmentIds.length)throw Error('請至少指定一件裝備');
 if(input.role!=='world'&&weights.mythic>0)throw Error('神話成品僅開放世界王／四龍');
 return {role:input.role,pool:input.pool,equipmentIds,weights,equipmentChance:finite(input.equipmentChance,0,100),pityKills:finite(input.pityKills,0,1000000,true),legendShardChance:finite(input.legendShardChance,0,100),mythicShardChance:finite(input.mythicShardChance,0,100)};
}
export function hybridRoleForBoss(zone:string):HybridRole{const b=(raw.worldBosses as Record<string,any>)[zone],m=mobs[b?.mob];return m?.dragon381||b?.members?.length||b?.count>1||m?.lv>=65?'world':'boss';}
export function progressionLevelBand(lv:number){return lv<30?'1–29':lv<45?'30–44':lv<55?'45–54':lv<65?'55–64':lv<75?'65–74':'75+';}
const candidateCache=new WeakMap<object,Map<string,Record<DropRank,string[]>>>(),emptyAppearance={};
export function hybridCandidates(rule:HybridRule,mob:string,zone:string,lv:number,appearance?:LootAppearanceConfig,now=Date.now(),mapMembers?:string[]){
 let cache=candidateCache.get(appearance||emptyAppearance);if(!cache){cache=new Map();candidateCache.set(appearance||emptyAppearance,cache);}const cacheKey=JSON.stringify([rule.role,rule.pool,rule.equipmentIds,mob,zone,lv,Math.floor(now/60000),mapMembers]);const cached=cache.get(cacheKey);if(cached)return cached;
 const boss=rule.role==='boss'||rule.role==='world';
 let ids:string[];
 if(rule.pool==='custom')ids=rule.equipmentIds;
 else if(boss)ids=bossRoomDrops(zone).map(d=>d.item);
 else {const members=[...new Set([mob,...(mapMembers||maps[zone]||[])])];ids=members.flatMap(id=>[...(PUBLIC_LOOT[id]?.drops||[]),...(PUBLIC_DROP_RATES[id]||[]).map(d=>d.item)]);}
 // Only the safe, priced 3.81 catalog can fill an otherwise empty default map pool.
 if(rule.pool==='map'&&!ids.some(id=>isProgressionEquipment(items[id])))ids=standard;
 const ceiling=boss?rule.role==='world'?5:4:lv<30?1:lv<45?2:lv<75?3:4;
 const rankFloor:Record<DropRank,number>={normal:1,advanced:15,rare:30,hero:45,legend:75,mythic:75};
 const pool=Object.fromEntries(ranks.map(r=>[r,[] as string[]])) as Record<DropRank,string[]>;
 for(const id of new Set(ids)){const i=items[id];if(!isProgressionEquipment(i)||i.availFrom>now||i.minLv>(boss?Math.max(50,lv):lv))continue;const rarity=itemRarity(id,appearance);if(!ranks.includes(rarity as DropRank))continue;const rank=rarity as DropRank;if(ranks.indexOf(rank)>ceiling||!boss&&rankFloor[rank]>lv)continue;if(!boss&&rule.pool==='map'&&i.p>Math.max(500,lv*lv*150))continue;pool[rank].push(id);}
 if(rule.pool==='map'){
  const fill=(rank:DropRank)=>{if(pool[rank].length||ranks.indexOf(rank)>ceiling)return;const candidates=standard.filter(id=>itemRarity(id,appearance)===rank&&(!items[id].availFrom||items[id].availFrom<=now)&&(items[id].minLv||0)<=(boss?Math.max(50,lv):lv)&&(boss||items[id].p<=Math.max(500,lv*lv*150)));if(!candidates.length)return;const start=parseInt(fingerprint(zone+':'+rank).split(':')[0],16)%candidates.length;pool[rank]=Array.from({length:Math.min(rank==='mythic'?1:3,candidates.length)},(_,n)=>candidates[(start+n)%candidates.length]);};
  if(boss){fill('hero');fill('legend');if(rule.role==='world')fill('mythic');}
  else if(!ranks.some(rank=>rule.weights[rank]>0&&pool[rank].length))for(const rank of ranks)if(rule.weights[rank]>0)fill(rank);
 }
 if(cache.size>=256)cache.clear();cache.set(cacheKey,pool);return pool;
}
export function hybridPreview(rule:HybridRule,pool:Record<DropRank,string[]>){const total=Object.values(rule.weights).reduce((a,b)=>a+b,0);return ranks.map(rank=>({rank,count:pool[rank].length,weight:rule.weights[rank],chance:pool[rank].length&&total?rule.equipmentChance*rule.weights[rank]/total:0}));}
const poolFingerprints=new WeakMap<object,string>();
function fingerprint(value:string){let a=2166136261,b=5381;for(let n=0;n<value.length;n++){a=Math.imul(a^value.charCodeAt(n),16777619);b=Math.imul(b,33)^value.charCodeAt(n);}return (a>>>0).toString(16)+':'+(b>>>0).toString(16);}
function hybridSignature(rule:HybridRule,pool:Record<DropRank,string[]>){let key=poolFingerprints.get(pool);if(!key){key=fingerprint(JSON.stringify(ranks.map(r=>pool[r])));poolFingerprints.set(pool,key);}return fingerprint(JSON.stringify(rule))+':'+key;}
export function rollHybridLoot(rule:HybridRule,pool:Record<DropRank,string[]>,rng:()=>number,dropPct=0,prior?:PityRecord){
 const signature=hybridSignature(rule,pool),misses=prior?.signature===signature?prior.misses:0;
 const any=ranks.some(r=>rule.weights[r]>0&&pool[r].length>0),due=any&&rule.equipmentChance>0&&rule.pityKills>0&&misses+1>=rule.pityKills;
 const drops:{item:string;quantity:number}[]=[];let equipment:string|undefined;
 if(any&&rule.equipmentChance>0&&(due||rng()<Math.min(100,rule.equipmentChance*(1+Math.max(0,dropPct)/100))/100)){
  const available:readonly DropRank[]=due?ranks.filter(r=>pool[r].length):ranks;const total=available.reduce<number>((n,r)=>n+rule.weights[r],0);let roll=rng()*total;let selected=available.at(-1)!;for(const r of available){roll-=rule.weights[r];if(roll<0){selected=r;break;}}
  const entries=pool[selected];if(entries.length){equipment=entries[Math.min(entries.length-1,Math.floor(rng()*entries.length))];drops.push({item:equipment,quantity:1});}
 }
 const shard=(item:string,chance:number)=>{if(chance>0&&rng()<Math.min(100,chance*(1+Math.max(0,dropPct)/100))/100)drops.push({item,quantity:1});};
 shard('mat_legend_shard',rule.legendShardChance);shard('mat_mythic_shard',rule.mythicShardChance);
 return {drops,pity:{signature,misses:equipment||!any||rule.equipmentChance<=0||!rule.pityKills?0:Math.min(misses+1,rule.pityKills)},guaranteed:due&&!!equipment};
}

/** Skip runs of misses and batch successful rank/item choices. Retains the
 * online pity counter without replaying combat or one full loot roll per kill. */
export function rollHybridLootBatch(rule:HybridRule,pool:Record<DropRank,string[]>,count:number,rng:()=>number,dropPct=0,prior?:PityRecord){
 const signature=hybridSignature(rule,pool),available=ranks.filter(r=>pool[r].length&&rule.weights[r]>0),total=ranks.reduce((n,r)=>n+rule.weights[r],0),weight=available.reduce((n,r)=>n+rule.weights[r],0);
 const chance=Math.min(1,rule.equipmentChance*(1+Math.max(0,dropPct)/100)/100)*(total?weight/total:0);
 let remaining=Math.max(0,Math.floor(count)),misses=prior?.signature===signature?prior.misses:0,hits=0;
 if(chance===1||chance>0&&rule.pityKills===1){hits=remaining;remaining=0;misses=0;}
 else if(chance>0){
  while(remaining>0){const wait=1+Math.floor(Math.log(Math.max(Number.MIN_VALUE,1-rng()))/Math.log1p(-chance)),due=rule.pityKills?Math.max(1,rule.pityKills-misses):Infinity,next=Math.min(wait,due);
   if(next>remaining){misses+=remaining;remaining=0;break;}remaining-=next;hits++;misses=0;
  }
 }else misses=0;
 const drops:Record<string,number>={};
 for(const [rank,n] of Object.entries(splitOfflineCount(hits,Object.fromEntries(available.map(r=>[r,rule.weights[r]])),rng))){const entries=pool[rank as DropRank];for(const [id,q] of Object.entries(splitOfflineCount(n,Object.fromEntries(entries.map(id=>[id,1])),rng)))drops[id]=(drops[id]||0)+q;}
 for(const [id,rate] of [['mat_legend_shard',rule.legendShardChance],['mat_mythic_shard',rule.mythicShardChance]] as const){const n=offlineBinomial(count,Math.min(1,rate*(1+Math.max(0,dropPct)/100)/100),rng);if(n)drops[id]=(drops[id]||0)+n;}
 return {drops:Object.entries(drops).map(([item,quantity])=>({item,quantity})),pity:{signature,misses:!rule.pityKills||!chance?0:Math.min(misses,rule.pityKills-1)}};
}

