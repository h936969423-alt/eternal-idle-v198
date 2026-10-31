import anchors from './monster-ground-anchors.json';
import meta from './combat-animation.json';
type Point=readonly number[];
type Sheet={src:string;w:number;h:number;count:number};
const sheets=anchors.atlases as Record<string,(Point|null)[]>;
const sourceFrames=anchors.sourceFrames as Record<string,Point>;
const sourceIdle=anchors.sourceIdle as Record<string,Point>;
/** Keep the ground contact at the idle position; body/weapon animation still plays. */
export function monsterGroundOffset(sheet:Sheet,frame:number,idle:Sheet):[number,number]{
 const current=sheets[sheet.src]?.[Math.max(0,Math.min(sheet.count-1,frame))];
 const origin=sheets[idle.src]?.find(p=>p!==null);
 if(!current||!origin)return [0,0];
 return [origin[0]/idle.w*sheet.w-current[0],origin[1]/idle.h*sheet.h-current[1]];
}
/** Source SPR coordinates include each frame's authored x/y offset. */
export function sourceMonsterGroundOffset(gfx:number,key:string,frame:number):[number,number]{
 const origin=sourceIdle[String(gfx)],current=sourceFrames[`${key}:${frame}`];
 return origin&&current?[origin[0]-current[0],origin[1]-current[1]]:[0,0];
}

const footCache=new Map<string,number>();
/** Ground contact of a monster's idle pose as a % of its square sprite box ("meet" letterboxing). Enlarged sprites scale around this point so they stay on their health bar. */
export function monsterFootPercent(name:string):number{
 const hit=footCache.get(name);if(hit!==undefined)return hit;
 const forms=(meta as Record<string,any>)[name],b=(forms?.['6']||forms?.root)?.idle?.body as Sheet|undefined;
 const p=b&&sheets[b.src]?.find(x=>x!==null);
 const frac=b?Math.min(1,b.h/b.w):1,value=p&&b?Math.round(((1-frac)/2+p[1]/b.h*frac)*1000)/10:100;
 footCache.set(name,value);return value;
}
