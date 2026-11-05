/** Client S32 collision: each digit holds bit 0 (y edge) and bit 1 (x edge). */
export type ClientMapGrid={cols:number;rows:number;edges:string[]};
export type MapCell={a:number;b:number};
const edge=(g:ClientMapGrid,a:number,b:number)=>a<0||b<0||a>=g.cols||b>=g.rows?3:Number(g.edges[a]?.[b]??3);
function straight(g:ClientMapGrid,a:number,b:number,da:number,db:number){
 if(da===1)return !(edge(g,a,b)&2)&&a+1<g.cols;
 if(da===-1)return !(edge(g,a-1,b)&2)&&a>0;
 if(db===1)return !(edge(g,a,b+1)&1)&&b+1<g.rows;
 if(db===-1)return !(edge(g,a,b)&1)&&b>0;
 return false;
}
export function canStep(g:ClientMapGrid,a:number,b:number,da:number,db:number){
 if(da===0||db===0)return straight(g,a,b,da,db);
 return straight(g,a,b,da,0)&&straight(g,a+da,b,0,db)&&straight(g,a,b,0,db)&&straight(g,a,b+db,da,0);
}
export function cellBlocked(g:ClientMapGrid,a:number,b:number){return ![[1,0],[-1,0],[0,1],[0,-1]].some(([da,db])=>straight(g,a,b,da,db));}
/** Shortest path, or the path to the reachable cell closest to an unreachable target. */
export function findMapPath(g:ClientMapGrid,from:MapCell,to:MapCell,limit=20000):MapCell[]{
 const key=(a:number,b:number)=>a*g.rows+b,parents=new Map<number,number>([[key(from.a,from.b),-1]]),queue=[from];
 const distance=(c:MapCell)=>Math.max(Math.abs(c.a-to.a),Math.abs(c.b-to.b));let best=from;
 for(let i=0;i<queue.length&&i<limit;i++){
  const c=queue[i];if(distance(c)<distance(best))best=c;if(c.a===to.a&&c.b===to.b){best=c;break;}
  for(const [da,db] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const k=key(c.a+da,c.b+db);if(!parents.has(k)&&canStep(g,c.a,c.b,da,db)){parents.set(k,key(c.a,c.b));queue.push({a:c.a+da,b:c.b+db});}}
 }
 const path:MapCell[]=[];let k=key(best.a,best.b);while(k!==key(from.a,from.b)&&k>=0){path.unshift({a:Math.floor(k/g.rows),b:k%g.rows});k=parents.get(k)??-1;}
 return path;
}
export const cellCenter=(a:number,b:number,offsetY:number)=>({x:(a+b)*24+24,y:(b-a)*12+offsetY+12});
export const pixelCell=(x:number,y:number,offsetY:number):MapCell=>{const u=(x-24)/24,v=(y-12-offsetY)/12;return {a:Math.round((u-v)/2),b:Math.round((u+v)/2)};};
