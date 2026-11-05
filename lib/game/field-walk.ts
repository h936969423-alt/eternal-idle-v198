/** Presentation only. Nothing here feeds combat, loot, saves or offline settlement. */
const CYCLE_MS=4200,MOVE_MS=1500;
export const MONSTER_WALK_RANGE={x:7,y:6};
function seedOf(uid:string){let h=2166136261;for(let i=0;i<uid.length;i++){h^=uid.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function waypoint(seed:number,step:number){const a=Math.imul(seed^Math.imul(step+1,2654435761),1597334677)>>>0,b=Math.imul(a^(a>>>15),2246822519)>>>0;return {x:(a%1000/500-1)*MONSTER_WALK_RANGE.x,y:(b%1000/500-1)*MONSTER_WALK_RANGE.y};}
/** Same uid and time always give the same place, so re-renders never make a monster jump. */
export function monsterWalk(uid:string,now:number){
 const seed=seedOf(uid),time=now+seed%CYCLE_MS,step=Math.floor(time/CYCLE_MS),phase=time-step*CYCLE_MS,from=waypoint(seed,step-1),to=waypoint(seed,step),moving=phase<MOVE_MS,t=moving?phase/MOVE_MS:1;
 return {x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t,moving};
}
/** Stop short of the target and never walk past it or out of the arena. */
export function playerWalkGoal(home:{x:number;y:number},target:{x:number;y:number}|undefined,arena:{width:number;height:number},ranged:boolean){
 if(!target)return {x:0,y:0};
 const gap=arena.width*(ranged?.42:.2),x=Math.max(0,Math.min(target.x-gap-home.x,arena.width*.9-home.x)),y=Math.max(arena.height*.08-home.y,Math.min(target.y-home.y,arena.height*.92-home.y));
 return {x,y};
}
export function stepToward(from:{x:number;y:number},goal:{x:number;y:number},distance:number){const dx=goal.x-from.x,dy=goal.y-from.y,length=Math.hypot(dx,dy);return length<=distance?{...goal}:{x:from.x+dx/length*distance,y:from.y+dy/length*distance};}
