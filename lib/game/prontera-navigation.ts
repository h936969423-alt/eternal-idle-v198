import city from './prontera.json';
export type CityPoint={x:number;y:number};
export const PRONTERA=city;
export function cityWalkable(p:CityPoint){return Number.isInteger(p.x)&&Number.isInteger(p.y)&&city.collision.rows[p.y]?.[p.x]===0;}
/** Four-neighbour tile-centre paths; no diagonal corner cutting. */
export function cityPath(from:CityPoint,to:CityPoint):CityPoint[]{
 if(!cityWalkable(from)||!cityWalkable(to))return [];
 const key=(p:CityPoint)=>p.y*64+p.x,start=key(from),end=key(to),queue=[from],parents=new Map<number,CityPoint|null>([[start,null]]);
 for(let i=0;i<queue.length;i++){
  const p=queue[i];if(key(p)===end){const path:CityPoint[]=[];let n:CityPoint|null=p;while(n&&key(n)!==start){path.unshift(n);n=parents.get(key(n))??null;}return path;}
  for(const n of [{x:p.x+1,y:p.y},{x:p.x-1,y:p.y},{x:p.x,y:p.y+1},{x:p.x,y:p.y-1}])if(cityWalkable(n)&&!parents.has(key(n))){parents.set(key(n),p);queue.push(n);}
 }
 return [];
}
export const CITY_VENDOR:Record<string,string>={event:'npc_events',material:'npc_moli',weapon:'npc_wino',armor:'npc_vangil',items:'npc_glin'};
