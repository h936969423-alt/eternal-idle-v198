/** Presentation only: places actors on client map cells. Combat, loot and saves never read this. */
import {canStep,cellCenter,findMapPath,type ClientMapGrid,type MapCell} from './client-map-path.ts';
import {monsterWalk} from './field-walk.ts';
export type WorldManifest=ClientMapGrid&{id:string;width:number;height:number;chunk:number;chunks:[number,number][];offsetY:number;spawn:[number,number]};
type Mover={a:number;b:number;path:MapCell[];goal?:string};
export const WORLD_PLAYER_SPEED=3.4,WORLD_MONSTER_SPEED=1.3;
function hash(text:string){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
/** Cells reachable from a start, up to a limit. */
export function reachable(map:ClientMapGrid,from:MapCell,limit=4000){const seen=new Set([from.a*map.rows+from.b]),queue=[from];for(let i=0;i<queue.length&&queue.length<limit;i++){const c=queue[i];for(const [da,db] of [[1,0],[-1,0],[0,1],[0,-1]]){const k=(c.a+da)*map.rows+c.b+db;if(!seen.has(k)&&canStep(map,c.a,c.b,da,db)){seen.add(k);queue.push({a:c.a+da,b:c.b+db});}}}return queue;}
/** The manifest spawn can sit in a small pocket, so look outward for open ground. */
export function pickSpawn(map:WorldManifest,minimum=300):MapCell{const start={a:map.spawn[0],b:map.spawn[1]};for(let r=0;r<map.cols/2;r+=4)for(let a=start.a-r;a<=start.a+r;a+=4)for(let b=start.b-r;b<=start.b+r;b+=4){if(a<1||b<1||a>=map.cols-1||b>=map.rows-1)continue;if(reachable(map,{a,b},minimum+1).length>minimum)return {a,b};}return start;}
export class WorldWalker{
 readonly map:WorldManifest;player:Mover;monsters=new Map<string,Mover&{home:MapCell}>();direction={da:0,db:0};moving=false;private ground:MapCell[];
 constructor(map:WorldManifest){this.map=map;const spawn=pickSpawn(map);this.player={...spawn,path:[]};this.ground=reachable(map,spawn,6000);}
 private cellFor(uid:string){const seed=hash(uid),near=this.ground.filter(c=>{const d=Math.max(Math.abs(c.a-this.player.a),Math.abs(c.b-this.player.b));return d>=5&&d<=10;});const pool=near.length?near:this.ground;return pool[seed%pool.length];}
 private advance(m:Mover,speed:number,seconds:number){let left=speed*seconds,moved=false;while(left>0&&m.path.length){const n=m.path[0],dx=n.a-m.a,dy=n.b-m.b,len=Math.hypot(dx,dy);if(len<=left){m.a=n.a;m.b=n.b;left-=len;m.path.shift();moved=true;}else{m.a+=dx/len*left;m.b+=dy/len*left;left=0;moved=true;}}return moved;}
 private cell(m:Mover):MapCell{return {a:Math.round(m.a),b:Math.round(m.b)};}
 private route(m:Mover,to:MapCell,goal:string){if(m.goal===goal)return;m.goal=goal;m.path=findMapPath(this.map,this.cell(m),to,6000);}
 tick(uids:string[],targetUid:string|undefined,running:boolean,ranged:boolean,now:number,seconds:number){
  const alive=new Set(uids);for(const uid of this.monsters.keys())if(!alive.has(uid))this.monsters.delete(uid);
  for(const uid of uids){let m=this.monsters.get(uid);if(!m){const c=this.cellFor(uid);m={a:c.a,b:c.b,home:c,path:[]};this.monsters.set(uid,m);}
   const w=monsterWalk(uid,now),goal={a:m.home.a+Math.round(w.x/3.5),b:m.home.b+Math.round(w.y/3)};if(uid!==targetUid&&Math.max(Math.abs(goal.a-m.a),Math.abs(goal.b-m.b))>=1&&findMapPath(this.map,this.cell(m),goal,200).length<=5)this.route(m,goal,`${goal.a},${goal.b}`);this.advance(m,WORLD_MONSTER_SPEED,seconds);}
  const target=targetUid?this.monsters.get(targetUid):undefined,before={a:this.player.a,b:this.player.b};
  if(running&&target){const reach=ranged?6:2,distance=Math.hypot(target.a-this.player.a,target.b-this.player.b);if(distance>reach){const to=this.cell(target);this.route(this.player,to,`${to.a},${to.b}`);if(this.player.path.length&&distance-1<reach)this.player.path.length=Math.min(this.player.path.length,1);}else{this.player.path=[];this.player.goal=undefined;}}else{this.player.path=[];this.player.goal=undefined;}
  this.moving=this.advance(this.player,WORLD_PLAYER_SPEED,seconds);if(this.moving)this.direction={da:this.player.a-before.a,db:this.player.b-before.b};
 }
 facing(targetUid?:string){const t=targetUid?this.monsters.get(targetUid):undefined;return t?{x:(t.a-this.player.a+t.b-this.player.b)*24,y:(t.b-this.player.b-t.a+this.player.a)*12}:undefined;}
 screenDelta(){return {x:(this.direction.da+this.direction.db)*24,y:(this.direction.db-this.direction.da)*12};}
 pixel(m:{a:number;b:number}){return cellCenter(m.a,m.b,this.map.offsetY);}
}
