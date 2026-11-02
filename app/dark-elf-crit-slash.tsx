'use client';
import {useEffect,useRef,type RefObject} from 'react';
import type {BattleView} from '@/lib/game/combat-presentation';
import {CRIT_SLASH_OFFSET,CRIT_SLASH_SCENE_WIDTH,critSparks,drawCritSlash,newCritSlashes} from '@/lib/game/crit-slash';
import {MONSTER_ANCHOR} from './monster-anchor';

type Slash={start:number;x:number;y:number;sparks:ReturnType<typeof critSparks>};
/** 黑暗妖精爆擊「血刃十字斬」: one arena-wide canvas, drawn imperatively only while a slash plays. */
export default function DarkElfCritSlash({view,arena}:{view:BattleView;arena:RefObject<HTMLDivElement|null>}){
 const canvas=useRef<HTMLCanvasElement>(null),seen=useRef(new Set<number>()),active=useRef<Slash[]>([]),frame=useRef(0),scale=useRef(1);
 useEffect(()=>{
  const fresh=newCritSlashes(view.floats||[],seen.current,performance.now());if(!fresh.length)return;
  const root=arena.current,cv=canvas.current;if(!root||!cv)return;
  const r=root.getBoundingClientRect(),dpr=Math.min(3,window.devicePixelRatio||1),k=r.width/CRIT_SLASH_SCENE_WIDTH;
  for(const f of fresh){
   seen.current.add(f.seq);
   const monster=root.querySelector(`[data-monster-slot="${f.slot}"] ${MONSTER_ANCHOR}`);
   if(!monster||monster.closest('[data-monster-uid]')?.getAttribute('data-monster-uid')!==f.uid)continue;
   const m=monster.getBoundingClientRect();
   active.current.push({start:f.shownAt,x:(m.left-r.left+m.width/2+CRIT_SLASH_OFFSET.x*k)*dpr,y:(m.top-r.top+m.height/2+CRIT_SLASH_OFFSET.y*k)*dpr,sparks:critSparks(f.seq)});
  }
  if(seen.current.size>400)seen.current=new Set([...seen.current].slice(-200));
  if(!active.current.length)return;
  scale.current=k*dpr;
  const w=Math.ceil(r.width*dpr),h=Math.ceil(r.height*dpr);if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;}
  Object.assign(cv.style,{width:`${r.width}px`,height:`${r.height}px`,visibility:'visible'});
  const ctx=cv.getContext('2d');if(!ctx)return;
  cancelAnimationFrame(frame.current);
  const tick=(now:number)=>{ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);
   active.current=active.current.filter(s=>drawCritSlash(ctx,now-s.start,s.x,s.y,scale.current,s.sparks)||now-s.start<0);
   if(active.current.length)frame.current=requestAnimationFrame(tick);else cv.style.visibility='hidden';};
  frame.current=requestAnimationFrame(tick);
 },[view.floats,arena]);
 useEffect(()=>()=>cancelAnimationFrame(frame.current),[]);
 return <canvas ref={canvas} aria-hidden="true" data-effect="dark-elf-crit-slash" style={{position:'absolute',left:0,top:0,pointerEvents:'none',zIndex:12,visibility:'hidden'}}/>;
}
