'use client';
import {useEffect,useRef,type RefObject} from 'react';
import type {BattleView} from '@/lib/game/combat-presentation';
import {PRESSURE_RING_BOX,PRESSURE_RING_LIFT,PRESSURE_RING_MS,PRESSURE_RING_SCENE_WIDTH,containedHeadPoint,drawPressureRing,pressureRingStarts} from '@/lib/game/triple-pressure-ring';

/** Topmost opaque row (and its centre column) of each sprite frame, measured once per image. */
const heads=new Map<string,{row:number;column:number}|null>();
function headOf(img:HTMLImageElement){
 const src=img.currentSrc||img.src;if(heads.has(src))return heads.get(src)!;
 let found:{row:number;column:number}|null=null;
 try{
  const w=img.naturalWidth,h=img.naturalHeight,probe=document.createElement('canvas');probe.width=w;probe.height=h;
  const ctx=probe.getContext('2d',{willReadFrequently:true});
  if(ctx&&w&&h){ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,w,h).data;
   for(let y=0;y<h&&!found;y++){let sum=0,n=0;for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>96){sum+=x;n++;}if(n>=2)found={row:y,column:sum/n};}}
 }catch{/* An unreadable frame falls back to the sprite box. */}
 heads.set(src,found);return found;
}
/** Head top of the player sprite, relative to the arena. */
function headPoint(root:HTMLElement){
 const sprite=root.querySelector<HTMLElement>('.character-sprite');if(!sprite)return null;
 const r=root.getBoundingClientRect(),s=sprite.getBoundingClientRect(),box={left:s.left-r.left,top:s.top-r.top,width:s.width,height:s.height};
 if(sprite instanceof HTMLImageElement&&sprite.complete&&sprite.naturalWidth){const head=headOf(sprite);if(head)return containedHeadPoint(box,{width:sprite.naturalWidth,height:sprite.naturalHeight},head);}
 return {x:box.left+box.width/2,y:box.top+box.height*.1};
}

/** 三重矢氣壓環: one canvas, drawn imperatively only while a ring plays (no React work per frame). */
export default function TriplePressureRing({view,arena}:{view:BattleView;arena:RefObject<HTMLDivElement|null>}){
 const canvas=useRef<HTMLCanvasElement>(null),last=useRef(-Infinity),frame=useRef(0);
 useEffect(()=>{
  const starts=pressureRingStarts(view.actions||[],last.current,performance.now());if(!starts.length)return;
  const start=starts[starts.length-1];last.current=start;
  const root=arena.current,cv=canvas.current;if(!root||!cv)return;const head=headPoint(root);if(!head)return;
  const k=root.getBoundingClientRect().width/PRESSURE_RING_SCENE_WIDTH,dpr=Math.min(3,window.devicePixelRatio||1);
  const w=PRESSURE_RING_BOX.width*k,h=PRESSURE_RING_BOX.height*k,cx=head.x,cy=head.y-PRESSURE_RING_LIFT*k;
  cv.width=Math.ceil(w*dpr);cv.height=Math.ceil(h*dpr);Object.assign(cv.style,{width:`${w}px`,height:`${h}px`,left:`${cx-w/2}px`,top:`${cy-h/2}px`,visibility:'visible'});
  const ctx=cv.getContext('2d');if(!ctx)return;
  cancelAnimationFrame(frame.current);
  const tick=(now:number)=>{ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);
   if(drawPressureRing(ctx,now-start,cv.width/2,cv.height/2,k*dpr))frame.current=requestAnimationFrame(tick);else cv.style.visibility='hidden';};
  frame.current=requestAnimationFrame(tick);
 },[view.actions,arena]);
 useEffect(()=>()=>cancelAnimationFrame(frame.current),[]);
 return <canvas ref={canvas} aria-hidden="true" data-effect="triple-pressure-ring" style={{position:'absolute',pointerEvents:'none',zIndex:12,visibility:'hidden'}}/>;
}
