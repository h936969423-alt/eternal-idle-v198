import raw from './gamedata.json';
import {mapPool,type MapGeneration} from './map-pools';
import {mapIsOpen,type MapAccessState} from './map-access';
import {PET_LURES} from './pet-roster';

type Ctx={mapPools?:Record<string,MapGeneration>;mapAccess?:MapAccessState;monsterDefinitions?:Record<string,{custom?:{name:string}}>};
export type LureTarget={mob:string;form:string;zones:string[]};
const mobs=raw.mobs as Record<string,{n?:string}>;
const towns=raw.towns as Record<string,unknown>;
const zoneNames=new Map((Object.values(raw.mapCategories) as {v:string;t:string}[][]).flat().map(z=>[z.v,z.t]));

/** Which animals a lure can catch right now: they must spawn in an open hunting map (GM pools included). */
export function lureAvailability(key:string,ctx:Ctx={},now=Date.now()):{available:LureTarget[];missing:string[]}{
 const lure=PET_LURES[key];if(!lure)return {available:[],missing:[]};
 const where=new Map<string,string[]>();
 for(const zone of Object.keys(raw.maps)){
  if(Object.hasOwn(towns,zone)||!mapIsOpen(zone,ctx.mapAccess,now))continue;
  for(const entry of mapPool(zone,ctx.mapPools)){const name=ctx.monsterDefinitions?.[entry.id]?.custom?.name||mobs[entry.id]?.n;if(!name||!Object.hasOwn(lure.mobs,name))continue;const list=where.get(name)||[];const label=zoneNames.get(zone)||zone;if(!list.includes(label))list.push(label);where.set(name,list);}
 }
 const available:LureTarget[]=[],missing:string[]=[];
 for(const [mob,form] of Object.entries(lure.mobs)){const zones=where.get(mob);if(zones?.length)available.push({mob,form,zones});else missing.push(mob);}
 return {available,missing};
}
