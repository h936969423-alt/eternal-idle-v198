'use client';
import {useEffect,useRef,type RefObject} from 'react';
import {playerWalkStore,walkDirection} from '@/lib/game/field-walk';
import {WorldWalker,type WorldManifest} from '@/lib/game/world-walker';

const GRID:WorldManifest={id:'field',cols:24,rows:24,edges:Array.from({length:24},()=> '0'.repeat(24)),width:1152,height:576,chunk:0,chunks:[],offsetY:276,spawn:[12,12]};

export default function FieldWalkDriver({arena,enabled,targetUid,running,ranged,identity}:{arena:RefObject<HTMLDivElement|null>;enabled:boolean;targetUid?:string;running:boolean;ranged:boolean;identity:string}){
 const latest=useRef({targetUid,running,ranged});latest.current={targetUid,running,ranged};
 useEffect(()=>{
  const root=arena.current;if(!root||!enabled)return;
  const walker=new WorldWalker(GRID),origin=walker.pixel(walker.player);
  const offsets=new Map<HTMLElement,{x:number;y:number}>();
  let frame=0,last=0,heading=2;
  const tick=(now:number)=>{
   frame=requestAnimationFrame(tick);
   const seconds=last?Math.min(.1,(now-last)/1000):0;last=now;
   if(document.hidden)return;
   const box=root.getBoundingClientRect();
   if(!box.width||!box.height)return;
   const monsters=[...root.querySelectorAll<HTMLElement>('.four-monster')].filter(el=>el.dataset.dead!=='true');
   const ids=monsters.map(el=>el.dataset.monsterUid||'');
   const {targetUid,running,ranged}=latest.current;
   const timings=new Map<string,number>();
   for(const [i,el] of monsters.entries())if(el.dataset.monsterStepMs!==undefined)timings.set(ids[i],Number(el.dataset.monsterStepMs));
   walker.tick(ids,targetUid,running,ranged,Date.now(),seconds,undefined,timings,true);
   const place=(el:HTMLElement,point:{x:number;y:number})=>{
    const r=el.getBoundingClientRect(),old=offsets.get(el)||{x:0,y:0};
    const x=box.width/2+(point.x-origin.x)*box.width/960-(r.left-box.left+r.width/2-old.x);
    const y=box.height*.58+(point.y-origin.y)*box.height/480-(r.bottom-box.top-old.y);
    offsets.set(el,{x,y});el.style.setProperty('--walk-x',`${x}px`);el.style.setProperty('--walk-y',`${y}px`);
   };
   const actor=root.querySelector<HTMLElement>('.four-player');if(actor)place(actor,walker.pixel(walker.player));
   for(const [i,el] of monsters.entries()){
    const m=walker.monsters.get(ids[i]);if(!m)continue;
    el.dataset.gridMoving=String(!!m.moving);
    el.dataset.gridDistance=String(m.walkDistance||0);
    const da=m.moving?(m.da||0):walker.player.a-m.a,db=m.moving?(m.db||0):walker.player.b-m.b;
    if(da||db)el.dataset.gridDirection=String(walkDirection((da+db)*24,(db-da)*12));place(el,walker.pixel(m));
   }
   const direction=walker.moving?walker.screenDelta():running?walker.facing(targetUid):undefined;
   if(direction&&(direction.x||direction.y))heading=walkDirection(direction.x,direction.y);
   playerWalkStore.set({moving:walker.moving,direction:heading,facing:heading,step:Math.floor(walker.walkDistance*4)});
  };
  frame=requestAnimationFrame(tick);
  return()=>{cancelAnimationFrame(frame);for(const el of offsets.keys()){delete el.dataset.gridMoving;delete el.dataset.gridDistance;delete el.dataset.gridDirection;el.style.removeProperty('--walk-x');el.style.removeProperty('--walk-y');}playerWalkStore.set({moving:false,direction:2,facing:2});};
 },[arena,enabled,identity]);
 return null;
}
