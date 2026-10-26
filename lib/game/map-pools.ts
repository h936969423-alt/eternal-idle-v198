import raw from './gamedata.json';
import {monsterPosition} from './battle-layout';
import type {MonsterDefinition} from './monster-config';
export type MapPoolEntry={id:string;weight:number;enabled:boolean};
export type SpawnPoint={x:number;y:number};
export type MapGeneration={spawnMode?:'random'|'fixed';spawnPoints?:SpawnPoint[];respawnRulesVersion?:2;enabled:boolean;count:number;respawnSeconds:number;entries:MapPoolEntry[]};
export type BossGeneration={enabled:boolean;count:number;respawnSeconds:number};
export type MapPoolConfig={revision:number;maps:Record<string,MapGeneration>;bosses:Record<string,BossGeneration>;history:{at:number;by:string;kind:'map'|'boss';zone:string;before:MapGeneration|BossGeneration|null;after:MapGeneration|BossGeneration|null}[]};
export function defaultMapGeneration(zone:string):MapGeneration{const count:Record<string,number>={};for(const id of (raw.maps as Record<string,string[]>)[zone]||[])count[id]=(count[id]||0)+1;return {spawnMode:'fixed',spawnPoints:defaultSpawnPoints(3),enabled:true,count:3,respawnSeconds:5,respawnRulesVersion:2,entries:Object.entries(count).map(([id,weight])=>({id,weight,enabled:true}))};}
export function defaultSpawnPoints(count:number):SpawnPoint[]{return Array.from({length:count},(_,slot)=>({...monsterPosition(slot,count)}));}
/** Migrate only legacy default coordinates; never replace GM-customized positions. */
function normalizedSpawnPoints(g:MapGeneration):SpawnPoint[]{
 const points=g.spawnPoints;
 if(!points||points.length!==g.count)return defaultSpawnPoints(g.count);
 if(g.count!==5||g.spawnMode==='random')return points;
 const legacy=[{x:54,y:32},{x:83,y:32},{x:54,y:58},{x:83,y:58},{x:54,y:84}];
 const same=points.every((p,i)=>Math.abs(p.x-legacy[i].x)<.01&&Math.abs(p.y-legacy[i].y)<.01);
 return same?defaultSpawnPoints(5):points;
}
export function normalizeMapGeneration(g:MapGeneration):MapGeneration{return {...g,...(g.respawnRulesVersion===2?{}:{respawnSeconds:5,respawnRulesVersion:2 as const}),spawnMode:g.spawnMode||'fixed',spawnPoints:normalizedSpawnPoints(g)};}
/** Positions are scene percentages; keep clear of the player, vitals and controls. */
export function chooseSpawnPoint(g:MapGeneration,slot:number,occupied:SpawnPoint[],rng:()=>number,previous?:SpawnPoint):SpawnPoint{
 if(g.spawnMode!=='random')return {...(g.spawnPoints?.[slot]||defaultSpawnPoints(g.count)[slot])};
 const candidates:SpawnPoint[]=[];for(const x of [50,62,74,86])for(const y of [32,49,66,83])candidates.push({x,y});
 const distance=(a:SpawnPoint,b:SpawnPoint)=>Math.hypot(a.x-b.x,a.y-b.y);
 let available=candidates.filter(p=>occupied.every(q=>distance(p,q)>=18)&&(!previous||distance(p,previous)>=12));
 if(!available.length)available=candidates.filter(p=>occupied.every(q=>distance(p,q)>=18));
 if(!available.length)available=[candidates.reduce((best,p)=>Math.min(...occupied.map(q=>distance(p,q)))>Math.min(...occupied.map(q=>distance(best,q)))?p:best)];
 return {...available[Math.min(available.length-1,Math.max(0,Math.floor(rng()*available.length)))]};
}
export function mapGeneration(zone:string,maps?:Record<string,MapGeneration>){return maps?.[zone]?normalizeMapGeneration(maps[zone]):defaultMapGeneration(zone);}
export function mapPool(zone:string,maps?:Record<string,MapGeneration>){const g=mapGeneration(zone,maps);return g.enabled?g.entries.filter(e=>e.enabled):[];}
export function validateMapPool(zone:any,input:any,custom:Record<string,MonsterDefinition>={}):MapGeneration{if(typeof zone!=='string'||!Object.hasOwn(raw.maps,zone)||Object.hasOwn(raw.towns,zone))throw Error('只能設定狩獵地圖');if(!input||typeof input.enabled!=='boolean'||!Number.isInteger(input.count)||input.count<1||input.count>6||typeof input.respawnSeconds!=='number'||!Number.isFinite(input.respawnSeconds)||input.respawnSeconds<.5||input.respawnSeconds>86400)throw Error('同場數量需為 1–6，重生時間需為 0.5–86,400 秒');if(!Array.isArray(input.entries)||input.entries.length>100)throw Error('每張地圖最多 100 種怪物');const mode=input.spawnMode??'fixed';if(!['random','fixed'].includes(mode))throw Error('生成方式需為隨機或定點');
 const points=input.spawnPoints??defaultSpawnPoints(input.count);if(!Array.isArray(points)||points.length!==input.count||points.some((p:any)=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<45||p.x>88||p.y<28||p.y>84))throw Error('每個生成位置都需設定座標：X 45–88、Y 28–84（%）');
 if(mode==='fixed'&&points.some((p:any,i:number)=>points.slice(0,i).some((q:any)=>Math.hypot(p.x-q.x,p.y-q.y)<14)))throw Error('定點位置距離需至少 14%，避免怪物重疊');
 const spawnPoints=points.map((p:any)=>({x:p.x,y:p.y}));const seen=new Set<string>();const entries=input.entries.map((e:any)=>{if(!e||typeof e.id!=='string'||(!Object.hasOwn(raw.mobs,e.id)&&!(Object.hasOwn(custom,e.id)&&custom[e.id]?.custom))||seen.has(e.id))throw Error('怪物不存在或重複');if(typeof e.enabled!=='boolean'||!Number.isInteger(e.weight)||e.weight<1||e.weight>100)throw Error('出現權重需為 1–100');seen.add(e.id);return {id:e.id,weight:e.weight,enabled:e.enabled};});return {spawnMode:mode,spawnPoints,enabled:input.enabled,count:input.count,respawnSeconds:input.respawnSeconds,respawnRulesVersion:2,entries};}
export function validateBossGeneration(zone:any,input:any):BossGeneration{const b=(raw.worldBosses as Record<string,any>)[zone];if(typeof zone!=='string'||!Object.hasOwn(raw.worldBosses,zone)||b.mvOnly)throw Error('此世界王不能設定生成');const max=b.members?.length?1:6;if(!input||typeof input.enabled!=='boolean'||!Number.isInteger(input.count)||input.count<1||input.count>max||!Number.isFinite(input.respawnSeconds)||input.respawnSeconds<1||input.respawnSeconds>604800)throw Error(`數量需為 1–${max}，重生時間需為 1–604,800 秒`);return {enabled:input.enabled,count:input.count,respawnSeconds:input.respawnSeconds};}
// Reuse the validated weighted pool for each unchanged GM map definition.
// Cache is bound to the definition object: a GM update loads a new object.
// Only the pick consumes RNG, exactly once as before.
const monsterPools=new WeakMap<MapGeneration,{entries:MapPoolEntry[];total:number}>();
const defaultMonsterPools=new Map<string,{entries:MapPoolEntry[];total:number}>();
function weightedMonsterPool(zone:string,maps?:Record<string,MapGeneration>){
 const original=maps?.[zone];
 if(original){
  const cached=monsterPools.get(original);
  if(cached)return cached;
  const entries=original.enabled?original.entries.filter(e=>e.enabled):[];
  const value={entries,total:entries.reduce((n,e)=>n+e.weight,0)};
  monsterPools.set(original,value);
  return value;
 }
 const cached=defaultMonsterPools.get(zone);
 if(cached)return cached;
 const entries=mapPool(zone);
 const value={entries,total:entries.reduce((n,e)=>n+e.weight,0)};
 defaultMonsterPools.set(zone,value);
 return value;
}
export function chooseMapMonster(zone:string,maps:Record<string,MapGeneration>|undefined,rng:()=>number){
 const {entries,total}=weightedMonsterPool(zone,maps);
 if(!total)return null;
 let pick=Math.min(.999999999,Math.max(0,rng()))*total;
 for(const e of entries){pick-=e.weight;if(pick<0)return e.id;}
 return entries.at(-1)!.id;
}
