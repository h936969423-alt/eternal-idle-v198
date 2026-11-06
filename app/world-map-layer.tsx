'use client';
import {useEffect,useRef,useState,type RefObject} from 'react';
import {playerWalkStore,walkDirection} from '@/lib/game/field-walk';
import {WorldWalker,type WorldManifest} from '@/lib/game/world-walker';
const ZOOM=.8,ANCHOR_Y=.56,FRAME_MS=33,BASE='/assets/client-world/v1/';
/** Shows the real map behind the arena and moves actors with CSS variables. Falls back by reporting failure. */
export default function WorldMapLayer({zone,arena,targetUid,running,ranged,onState}:{zone:string;arena:RefObject<HTMLDivElement|null>;targetUid?:string;running:boolean;ranged:boolean;onState:(ready:boolean)=>void}){
 const [map,setMap]=useState<WorldManifest|null>(null),[cells,setCells]=useState<[number,number][]>([]),plane=useRef<HTMLDivElement>(null),latest=useRef({targetUid,running,ranged});latest.current={targetUid,running,ranged};
 useEffect(()=>{let live=true;setMap(null);onState(false);fetch(`${BASE}${zone}/manifest.json`).then(r=>{if(!r.ok)throw new Error(String(r.status));return r.json() as Promise<WorldManifest>;}).then(m=>{if(live){setMap(m);onState(true);}}).catch(()=>{if(live)onState(false);});return()=>{live=false;onState(false);};},[zone,onState]);
 useEffect(()=>{const root=arena.current;if(!root||!map)return;
  const walker=new WorldWalker(map),offsets=new WeakMap<HTMLElement,{x:number;y:number}>(),have=new Set(map.chunks.map(([x,y])=>`${x}_${y}`));let frame=0,last=0,shown='';
  const place=(el:HTMLElement,x:number,y:number)=>{const previous=offsets.get(el)||{x:0,y:0},r=el.getBoundingClientRect(),box=root.getBoundingClientRect(),baseX=r.left-box.left+r.width/2-previous.x,baseY=r.top-box.top+r.height/2-previous.y,next={x:x-baseX,y:y-baseY};offsets.set(el,next);el.style.setProperty('--walk-x',`${next.x.toFixed(1)}px`);el.style.setProperty('--walk-y',`${next.y.toFixed(1)}px`);};
  const tick=(now:number)=>{frame=requestAnimationFrame(tick);if(now-last<FRAME_MS||document.hidden)return;const seconds=Math.min(.1,(now-last)/1000);last=now;const box=root.getBoundingClientRect();if(!box.width||!box.height)return;
   const monsters=[...root.querySelectorAll<HTMLElement>('.four-monster')],alive=monsters.filter(el=>el.dataset.dead!=='true'),uids=alive.map(el=>el.dataset.monsterUid||'');
   walker.tick(uids,latest.current.targetUid,latest.current.running,latest.current.ranged,Date.now(),seconds);
   const camera=walker.pixel(walker.player),ax=box.width/2,ay=box.height*ANCHOR_Y;
   if(plane.current)plane.current.style.transform=`translate3d(${(ax-camera.x*ZOOM).toFixed(1)}px,${(ay-camera.y*ZOOM).toFixed(1)}px,0) scale(${ZOOM})`;
   const size=map.chunk*ZOOM,minX=Math.floor((camera.x*ZOOM-ax)/size),maxX=Math.floor((camera.x*ZOOM+box.width-ax)/size),minY=Math.floor((camera.y*ZOOM-ay)/size),maxY=Math.floor((camera.y*ZOOM+box.height-ay)/size),key=`${minX},${maxX},${minY},${maxY}`;
   if(key!==shown){shown=key;const next:[number,number][]=[];for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++)if(have.has(`${x}_${y}`))next.push([x,y]);setCells(next);}
   const actor=root.querySelector<HTMLElement>('.four-player');if(actor)place(actor,ax,ay);
   for(const el of alive){const m=walker.monsters.get(el.dataset.monsterUid||'');if(!m)continue;const p=walker.pixel(m);place(el,ax+(p.x-camera.x)*ZOOM,ay+(p.y-camera.y)*ZOOM);}
   const delta=walker.screenDelta();playerWalkStore.set({moving:walker.moving,direction:walker.moving?walkDirection(delta.x,delta.y):2});
  };
  frame=requestAnimationFrame(tick);
  return()=>{cancelAnimationFrame(frame);playerWalkStore.set({moving:false,direction:2});root.querySelectorAll<HTMLElement>('.four-player,.four-monster').forEach(el=>{el.style.removeProperty('--walk-x');el.style.removeProperty('--walk-y');});};
 },[map,arena]);
 if(!map)return null;
 return <div className="world-map-layer" aria-hidden="true"><div ref={plane} className="world-map-plane">{cells.map(([x,y])=><img key={`${x}-${y}`} src={`${BASE}${zone}/${x}_${y}.webp`} alt="" draggable={false} style={{left:x*map.chunk,top:y*map.chunk}}/>)}</div></div>;
}
