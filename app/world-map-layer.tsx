'use client';
import {useEffect,useRef,useState,type RefObject} from 'react';
import {playerWalkStore,walkDirection,worldCombatGate} from '@/lib/game/field-walk';
import {pixelCell} from '@/lib/game/client-map-path';
import {cellCenter} from '@/lib/game/client-map-path';
import {WorldWalker,pickSpawn,stripCovers,type WorldManifest} from '@/lib/game/world-walker';
import {worldMinimap} from '@/lib/game/minimap-store';
const ZOOM=1,ANCHOR_Y=.56,FRAME_MS=33,BASE='/assets/client-world/v1/';
/** Shows the real map behind the arena and moves actors with CSS variables. Falls back by reporting failure. */
export default function WorldMapLayer({zone,arena,targetUid,running,ranged,playerStepMs,onState}:{zone:string;arena:RefObject<HTMLDivElement|null>;targetUid?:string;running:boolean;ranged:boolean;playerStepMs?:number;onState:(ready:boolean)=>void}){
 const [map,setMap]=useState<WorldManifest|null>(null),[cells,setCells]=useState<[number,number][]>([]),[strips,setStrips]=useState<NonNullable<WorldManifest['over']>>([]),plane=useRef<HTMLDivElement>(null),overPlane=useRef<HTMLDivElement>(null),latest=useRef({targetUid,running,ranged,playerStepMs});latest.current={targetUid,running,ranged,playerStepMs};
 useEffect(()=>{let live=true;setMap(null);onState(false);fetch(`${BASE}${zone}/manifest.json`).then(r=>{if(!r.ok)throw new Error(String(r.status));return r.json() as Promise<WorldManifest>;}).then(async m=>{const spawn=pickSpawn(m),center=cellCenter(spawn.a,spawn.b,m.offsetY),box=arena.current?.getBoundingClientRect(),halfW=(box?.width||400)/2+m.chunk,halfH=(box?.height||700)/2+m.chunk,near=m.chunks.filter(([x,y])=>Math.abs((x+.5)*m.chunk-center.x)<=halfW&&Math.abs((y+.5)*m.chunk-center.y)<=halfH);await Promise.race([Promise.all(near.map(([x,y])=>new Promise(done=>{const image=new Image();image.onload=image.onerror=()=>done(null);image.src=`${BASE}${zone}/${x}_${y}.webp`;}))),new Promise(done=>setTimeout(done,5000))]);if(live){setMap(m);onState(true);}}).catch(()=>{if(live)onState(false);});return()=>{live=false;onState(false);};},[zone,onState,arena]);
 useEffect(()=>{const root=arena.current;if(!root||!map)return;
  const walker=new WorldWalker(map),offsets=new WeakMap<HTMLElement,{x:number;y:number}>(),have=new Set(map.chunks.map(([x,y])=>`${x}_${y}`));let frame=0,last=0,shown='',coverShown='',camera=walker.pixel(walker.player);
  const place=(el:HTMLElement,x:number,y:number,foot:string)=>{const previous=offsets.get(el)||{x:0,y:0},r=(foot?el.querySelector<HTMLElement>(foot)||el:el).getBoundingClientRect(),box=root.getBoundingClientRect(),baseX=r.left-box.left+r.width/2-previous.x,baseY=r.bottom-box.top-previous.y,next={x:x-baseX,y:y-baseY};offsets.set(el,next);el.style.setProperty('--walk-x',`${next.x.toFixed(1)}px`);el.style.setProperty('--walk-y',`${next.y.toFixed(1)}px`);};
  const tick=(now:number)=>{frame=requestAnimationFrame(tick);if(now-last<FRAME_MS||document.hidden)return;const seconds=Math.min(.1,(now-last)/1000);last=now;const box=root.getBoundingClientRect();if(!box.width||!box.height)return;
   const monsters=[...root.querySelectorAll<HTMLElement>('.four-monster')],alive=monsters.filter(el=>el.dataset.dead!=='true'),uids=alive.map(el=>el.dataset.monsterUid||'');
   if(walker.aim&&!uids.includes(walker.aim))walker.aim=undefined;const chase=walker.aim||latest.current.targetUid;walker.tick(uids,chase,latest.current.running,latest.current.ranged,Date.now(),seconds,latest.current.playerStepMs);
   const playerPixel=walker.pixel(walker.player),ax=box.width/2,ay=box.height*ANCHOR_Y;
   // Let nearby steps move the actor on screen before scrolling the map.
   const marginX=box.width*.18/ZOOM,marginY=box.height*.13/ZOOM;
   camera={x:Math.max(playerPixel.x-marginX,Math.min(camera.x,playerPixel.x+marginX)),y:Math.max(playerPixel.y-marginY,Math.min(camera.y,playerPixel.y+marginY))};
   const shift=`translate3d(${(ax-camera.x*ZOOM).toFixed(1)}px,${(ay-camera.y*ZOOM).toFixed(1)}px,0) scale(${ZOOM})`;if(plane.current)plane.current.style.transform=shift;if(overPlane.current)overPlane.current.style.transform=shift;
   const size=map.chunk*ZOOM,minX=Math.floor((camera.x*ZOOM-ax)/size)-1,maxX=Math.floor((camera.x*ZOOM+box.width-ax)/size)+1,minY=Math.floor((camera.y*ZOOM-ay)/size)-1,maxY=Math.floor((camera.y*ZOOM+box.height-ay)/size)+1,key=`${minX},${maxX},${minY},${maxY}`;
   if(key!==shown){shown=key;const next:[number,number][]=[];for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++)if(have.has(`${x}_${y}`))next.push([x,y]);setCells(next);}
   const row=Math.round(walker.player.b-walker.player.a),left=camera.x-ax/ZOOM,right=camera.x+(box.width-ax)/ZOOM,top=camera.y-ay/ZOOM,bottom=camera.y+(box.height-ay)/ZOOM,covering=(map.over||[]).filter(([bucket,,x,y,w,h])=>stripCovers(bucket,map.cols,row)&&x<right&&x+w>left&&y<bottom&&y+h>top),coverKey=covering.map(strip=>`${strip[0]}_${strip[1]}`).join();if(coverKey!==coverShown){coverShown=coverKey;setStrips(covering);}
   root.classList.toggle('world-walking',walker.moving);
   const actor=root.querySelector<HTMLElement>('.four-player');if(actor)place(actor,ax+(playerPixel.x-camera.x)*ZOOM,ay+(playerPixel.y-camera.y)*ZOOM,'');
   for(const el of alive){const m=walker.monsters.get(el.dataset.monsterUid||'');if(!m)continue;const p=walker.pixel(m);place(el,ax+(p.x-camera.x)*ZOOM,ay+(p.y-camera.y)*ZOOM,'.four-monster-art');}
   const delta=walker.screenDelta(),face=walker.facing(chase);playerWalkStore.set({moving:walker.moving,step:Math.floor(walker.walkDistance*(latest.current.playerStepMs?4:3)),direction:walker.moving?walkDirection(delta.x,delta.y):2,facing:latest.current.running&&face&&!walker.manual?walkDirection(face.x,face.y):2});
  };
  // Tapping open ground walks there; controls and monsters keep their own taps.
  const tap=(event:MouseEvent)=>{const element=event.target as Element|null;if(element?.closest('button,a,input,select,summary,.four-target,.battle-vitals,[role=button]'))return;const box=root.getBoundingClientRect();walker.moveTo(pixelCell(camera.x+(event.clientX-box.left-box.width/2)/ZOOM,camera.y+(event.clientY-box.top-box.height*ANCHOR_Y)/ZOOM,map.offsetY));};
  root.addEventListener('click',tap);
  worldCombatGate.current={blocks:uid=>walker.blocks(uid,latest.current.ranged),aim:uid=>{walker.aim=uid;},snap:uid=>walker.snap(uid),behind:ms=>{walker.speedBoost=1+Math.min(1,ms/2000);}};
  worldMinimap.current={zone,map,walker,base:`${BASE}${zone}/`};
  frame=requestAnimationFrame(tick);
  return()=>{if(worldMinimap.current?.walker===walker)worldMinimap.current=null;worldCombatGate.current=null;root.removeEventListener('click',tap);root.classList.remove('world-walking');cancelAnimationFrame(frame);playerWalkStore.set({moving:false,direction:2,facing:2});root.querySelectorAll<HTMLElement>('.four-player,.four-monster').forEach(el=>{el.style.removeProperty('--walk-x');el.style.removeProperty('--walk-y');});};
 },[map,arena]);
 if(!map)return null;
 return <><div className="world-map-over" aria-hidden="true"><div ref={overPlane} className="world-map-plane">{strips.map(([bucket,col,x,y])=><img key={`${bucket}-${col}`} src={`${BASE}${zone}/o${bucket}_${col}.webp`} alt="" draggable={false} style={{left:x,top:y}}/>)}</div></div><div className="world-map-layer" aria-hidden="true"><div ref={plane} className="world-map-plane">{cells.map(([x,y])=><img key={`${x}-${y}`} src={`${BASE}${zone}/${x}_${y}.webp`} alt="" draggable={false} style={{left:x*map.chunk,top:y*map.chunk}}/>)}</div></div></>;
}
