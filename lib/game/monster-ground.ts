import anchors from './monster-ground-anchors.json';
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
