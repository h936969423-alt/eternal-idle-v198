/** Presentation only: places actors on client map cells. Combat, loot and saves never read this. */
import {canStep,cellCenter,findMapPath,type ClientMapGrid,type MapCell} from './client-map-path.ts';
export const STEP_381_MS=640;
const DIRECTIONS=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
export type WorldManifest=ClientMapGrid&{id:string;width:number;height:number;chunk:number;chunks:[number,number][];offsetY:number;spawn:[number,number];over?:[number,number,number,number,number,number][]};
type Mover={a:number;b:number;path:MapCell[];goal?:string;nextWander?:number;moving?:boolean};
export const WORLD_MANUAL_REST=1.5,WORLD_MELEE_REACH=1.5,WORLD_BOW_REACH=6;
function hash(text:string){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
/** Cells reachable from a start, up to a limit. */
export function reachable(map:ClientMapGrid,from:MapCell,limit=4000){const seen=new Set([from.a*map.rows+from.b]),queue=[from];for(let i=0;i<queue.length&&queue.length<limit;i++){const c=queue[i];for(const [da,db] of [[1,0],[-1,0],[0,1],[0,-1]]){const k=(c.a+da)*map.rows+c.b+db;if(!seen.has(k)&&canStep(map,c.a,c.b,da,db)){seen.add(k);queue.push({a:c.a+da,b:c.b+db});}}}return queue;}
/** The manifest spawn can sit in a small pocket, so look outward for open ground. */
export function pickSpawn(map:WorldManifest,minimum=300):MapCell{const start={a:map.spawn[0],b:map.spawn[1]};for(let r=0;r<map.cols/2;r+=4)for(let a=start.a-r;a<=start.a+r;a+=4)for(let b=start.b-r;b<=start.b+r;b+=4){if(a<1||b<1||a>=map.cols-1||b>=map.rows-1)continue;if(reachable(map,{a,b},minimum+1).length>minimum)return {a,b};}return start;}
export class WorldWalker{
 readonly map:WorldManifest;player:Mover;monsters=new Map<string,Mover&{home:MapCell}>();direction={da:0,db:0};moving=false;walkDistance=0;manual=false;aim?:string;private manualRest=0;private ground:MapCell[];
 constructor(map:WorldManifest){this.map=map;const spawn=pickSpawn(map);this.player={...spawn,path:[]};this.ground=reachable(map,spawn,6000);}
 private cellFor(uid:string){const seed=hash(uid),near=this.ground.filter(c=>{const d=Math.max(Math.abs(c.a-this.player.a),Math.abs(c.b-this.player.b));return d>=3&&d<=5;}),clear=near.filter(c=>[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]].every(([da,db])=>canStep(this.map,c.a,c.b,da,db))),pool=clear.length?clear:near.length?near:this.ground;return pool[seed%pool.length];}
 private advance(m:Mover,speed:number,seconds:number,byTile=false){let left=speed*seconds,moved=false;while(left>0&&m.path.length){const n=m.path[0],dx=n.a-m.a,dy=n.b-m.b,len=byTile?Math.max(Math.abs(dx),Math.abs(dy)):Math.hypot(dx,dy);if(m===this.player&&len>0){this.walkDistance+=Math.min(left,len);this.direction={da:dx,db:dy};}if(len<=left){m.a=n.a;m.b=n.b;left-=len;m.path.shift();moved=true;}else{m.a+=dx/len*left;m.b+=dy/len*left;left=0;moved=true;}}return moved;}
 private cell(m:Mover):MapCell{return {a:Math.round(m.a),b:Math.round(m.b)};}
 private route(m:Mover,to:MapCell,goal:string){if(m.goal===goal)return;m.goal=goal;const next=m.path[0];m.path=next?[next,...findMapPath(this.map,next,to,6000)]:findMapPath(this.map,this.cell(m),to,6000);}
 /** Stops at the next cell, so an actor never ends a move between two cells across a wall. */
 private halt(m:Mover){m.path=Number.isInteger(m.a)&&Number.isInteger(m.b)?[]:m.path.slice(0,1);m.goal=undefined;}
 private canMelee(m:Mover){const from=this.cell(this.player),to=this.cell(m),da=to.a-from.a,db=to.b-from.b;return Math.max(Math.abs(da),Math.abs(db))===1&&canStep(this.map,from.a,from.b,da,db);}
 /** Tap to move: walks there first, then hunting resumes. */
 moveTo(cell:MapCell){this.manual=true;this.manualRest=0;this.route(this.player,cell,`manual:${cell.a},${cell.b}`);}
 tick(uids:string[],targetUid:string|undefined,running:boolean,ranged:boolean,now:number,seconds:number,playerStepMs=STEP_381_MS,monsterSteps?:ReadonlyMap<string,number>,pursue=false){
  const alive=new Set(uids);for(const uid of this.monsters.keys())if(!alive.has(uid))this.monsters.delete(uid);
  for(const uid of uids){let m=this.monsters.get(uid);if(!m){const c=this.cellFor(uid);m={a:c.a,b:c.b,home:c,path:[]};this.monsters.set(uid,m);}
   const ms=monsterSteps?.get(uid)??STEP_381_MS;
   if(ms<=0){m.moving=false;continue;}
   if(uid===targetUid){
    const from=this.cell(m),to=this.cell(this.player);
    if(!pursue||!running||Math.max(Math.abs(from.a-to.a),Math.abs(from.b-to.b))<=1)this.halt(m);
    else{
     this.route(m,to,`pursue:${to.a},${to.b}`);
     if(m.path.at(-1)?.a===to.a&&m.path.at(-1)?.b===to.b)m.path.pop();
    }
   }else if(!m.path.length&&now>=(m.nextWander??0)){
    const roll=hash(`${uid}:${now}`),direction=DIRECTIONS[roll%40];
    m.nextWander=now+ms;
    if(direction){
     const [da,db]=direction;let {a,b}=this.cell(m);
     for(let i=0;i<1+(roll>>>8)%6&&canStep(this.map,a,b,da,db);i++){
      a+=da;b+=db;m.path.push({a,b});
     }
    }
   }
   m.moving=this.advance(m,1000/ms,seconds,true);
  }
  const target=targetUid?this.monsters.get(targetUid):undefined;
  if(this.manual){if(!this.player.path.length){this.player.goal=undefined;this.manualRest+=seconds;if(this.manualRest>=WORLD_MANUAL_REST)this.manual=false;}}
  else if(running&&target){const reach=ranged?WORLD_BOW_REACH:WORLD_MELEE_REACH,distance=Math.hypot(target.a-this.player.a,target.b-this.player.b);if(ranged?distance>reach:!this.canMelee(target)){const to=this.cell(target);const key=`${to.a},${to.b}:${ranged}`;if(this.player.goal!==key){this.route(this.player,to,key);if(!ranged&&this.player.path.length){const end=this.player.path.at(-1);if(end?.a===to.a&&end.b===to.b)this.player.path.pop();}}}else this.halt(this.player);}else this.halt(this.player);
  this.moving=this.advance(this.player,1000/playerStepMs,seconds,true);if(!this.moving)this.walkDistance=0;
 }
 /** True while a hit on this monster would land from out of reach. Unknown monsters never block. */
 blocks(uid:string,ranged:boolean){const m=this.monsters.get(uid);if(!m)return false;if(this.manual||!ranged&&this.moving)return true;return ranged?Math.hypot(m.a-this.player.a,m.b-this.player.b)>WORLD_BOW_REACH+.35:!this.canMelee(m);}
 facing(targetUid?:string){const t=targetUid?this.monsters.get(targetUid):undefined;return t?{x:(t.a-this.player.a+t.b-this.player.b)*24,y:(t.b-this.player.b-t.a+this.player.a)*12}:undefined;}
 screenDelta(){return {x:(this.direction.da+this.direction.db)*24,y:(this.direction.db-this.direction.da)*12};}
 pixel(m:{a:number;b:number}){return cellCenter(m.a,m.b,this.map.offsetY);}
}
/** Strips of tall objects standing nearer the viewer than this row must be drawn over actors. */
export const stripCovers=(bucket:number,cols:number,row:number)=>bucket*2-cols>row;
