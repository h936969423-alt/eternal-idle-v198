'use client';
import {useEffect,useRef,type RefObject} from 'react';
import {monsterWalk,playerWalkGoal,playerWalkStore,stepToward,walkDirection} from '@/lib/game/field-walk';
const PLAYER_SPEED=.11,FRAME_MS=33;
/** Moves actors with CSS variables so combat state and React renders stay untouched. */
export default function FieldWalkDriver({arena,enabled,targetUid,running,ranged}:{arena:RefObject<HTMLDivElement|null>;enabled:boolean;targetUid?:string;running:boolean;ranged:boolean}){
 const latest=useRef({targetUid,running,ranged});latest.current={targetUid,running,ranged};
 useEffect(()=>{
  const root=arena.current;if(!root)return;
  const clear=()=>{root.querySelectorAll<HTMLElement>('.four-player,.four-monster').forEach(el=>{el.style.removeProperty('--walk-x');el.style.removeProperty('--walk-y');});};
  if(!enabled||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){clear();return;}
  let frame=0,last=0,player={x:0,y:0};
  const tick=(now:number)=>{
   frame=requestAnimationFrame(tick);if(now-last<FRAME_MS||document.hidden)return;const seconds=Math.min(.1,(now-last)/1000);last=now;
   const box=root.getBoundingClientRect();if(!box.width||!box.height)return;const clock=Date.now();let target:{x:number;y:number}|undefined;
   root.querySelectorAll<HTMLElement>('.four-monster').forEach(el=>{
    if(el.dataset.dead==='true')return;const uid=el.dataset.monsterUid||'',walk=monsterWalk(uid,clock),x=walk.x/100*box.width,y=walk.y/100*box.height;
    el.style.setProperty('--walk-x',`${x.toFixed(1)}px`);el.style.setProperty('--walk-y',`${y.toFixed(1)}px`);
    if(uid===latest.current.targetUid){const r=el.getBoundingClientRect();target={x:r.left-box.left+r.width/2,y:r.top-box.top+r.height/2};}
   });
   const actor=root.querySelector<HTMLElement>('.four-player');if(!actor)return;
   const r=actor.getBoundingClientRect(),home={x:r.left-box.left+r.width/2-player.x,y:r.top-box.top+r.height/2-player.y};
   const before=player;player=stepToward(player,playerWalkGoal(home,latest.current.running?target:undefined,box,latest.current.ranged),box.width*PLAYER_SPEED*seconds);
   const dx=player.x-before.x,dy=player.y-before.y,moved=Math.hypot(dx,dy)>.05;playerWalkStore.set({moving:moved,direction:moved?walkDirection(dx,dy):2});
   actor.style.setProperty('--walk-x',`${player.x.toFixed(1)}px`);actor.style.setProperty('--walk-y',`${player.y.toFixed(1)}px`);
  };
  frame=requestAnimationFrame(tick);
  return()=>{cancelAnimationFrame(frame);clear();playerWalkStore.set({moving:false,direction:2});};
 },[arena,enabled]);
 return null;
}
