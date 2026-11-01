'use client';
import {useEffect,useState,type RefObject} from 'react';
import {Info} from 'lucide-react';
import type {Encounter} from '@/lib/game/engine';
type Spot={slot:number;uid:string;left:number;top:number};
/** Each monster's drop button, drawn above every monster sprite.
 * Inside a monster block it shared that block's stacking context, so a
 * neighbouring sprite drawn later covered it and a tap targeted that monster instead. */
export default function MonsterDropLayer({arena,monsters,names,inspect}:{arena:RefObject<HTMLDivElement|null>;monsters:Encounter[];names:string[];inspect:(slot:number)=>void}){
 const [spots,setSpots]=useState<Spot[]>([]);
 useEffect(()=>{
  const measure=()=>{const root=arena.current,box=root?.getBoundingClientRect();if(!root||!box?.width)return;
   const next:Spot[]=[];monsters.forEach((m,slot)=>{if(m.hp<=0)return;const anchor=root.querySelector(`[data-monster-slot="${slot}"] .monster-drop-anchor`)?.getBoundingClientRect();if(!anchor?.width)return;next.push({slot,uid:m.uid,left:Math.round(anchor.left-box.left),top:Math.round(anchor.top-box.top)});});
   setSpots(old=>old.length===next.length&&old.every((s,i)=>s.slot===next[i].slot&&s.uid===next[i].uid&&s.left===next[i].left&&s.top===next[i].top)?old:next);};
  measure();const timer=setInterval(measure,250);window.addEventListener('resize',measure);
  return()=>{clearInterval(timer);window.removeEventListener('resize',measure);};
 },[arena,monsters]);
 return <div className="monster-drop-layer">{spots.map(s=><button key={s.uid} type="button" className="monster-drop-query" style={{left:s.left,top:s.top}} aria-label={`查看${names[s.slot]}掉落物`} title={`查看${names[s.slot]}能力與掉落物`} onClick={e=>{e.stopPropagation();inspect(s.slot);}}><Info size={11} aria-hidden="true"/>掉落物</button>)}</div>;
}
