'use client';
import {useEffect,useLayoutEffect,useMemo,useRef,useState,type CSSProperties,type RefObject} from 'react';
import {importedEffects,importedFrame,type EffectClip} from '@/lib/game/imported-effects';
import type {Character} from '@/lib/game/engine';
import type {BattleView} from '@/lib/game/combat-presentation';
import {useCombatEffects} from './combat-effects-context';
export function EffectAtlas({clip,age,width=150}:{clip:EffectClip;age:number;width?:number}){
 const n=importedFrame(clip,age),scale=Math.min(width/clip.width,190/clip.height,1.5),w=clip.width*scale,h=clip.height*scale;
 return <span aria-hidden="true" style={{display:'block',width:w,height:h,backgroundImage:`url(/assets/dasu-v1/${clip.sheet})`,backgroundSize:`${clip.cols*w}px ${Math.ceil(clip.count/clip.cols)*h}px`,backgroundPosition:`-${n%clip.cols*w}px -${Math.floor(n/clip.cols)*h}px`,backgroundRepeat:'no-repeat'}}/>;
}
type Anchor={left:string;top:string};
export default function ImportedCombatEffects({c,view,arena}:{c:Character;view:BattleView;arena:RefObject<HTMLDivElement|null>}){
 const config=useCombatEffects(),[clock,setClock]=useState(0),anchors=useRef(new Map<number,Anchor>());
 // Resolve only events that actually have an enabled visual, once per packet.
 const effects=useMemo(()=>!config.enabled?[]:(view.actions||[]).flatMap(e=>{
  if(e.visualPhase==='launch')return [];
  const triple=e.kind==='magic'&&e.skill==='sk_elf_triple';
  const tripleIds=triple?importedEffects.triple.filter(id=>importedEffects.entries[id].code==='11764-0'):e.kind==='attack'&&e.skill==='sk_elf_triple'&&!e.miss?importedEffects.triple.filter(id=>importedEffects.entries[id].code==='4394-0'):[];
  const clips=tripleIds.map(id=>({id,entry:importedEffects.entries[id],clip:importedEffects.clips[importedEffects.entries[id].clip]}));
  if(!clips.length)return [];
  return [{e,clips,player:triple,lifetime:Math.max(...clips.map(x=>x.clip.count/x.clip.fps*1000))}];
 }),[view.actions,c,config]);
 useLayoutEffect(()=>{
  const now=performance.now(),host=arena.current,live=new Set(effects.map(x=>x.e.seq));
  for(const seq of anchors.current.keys())if(!live.has(seq))anchors.current.delete(seq);
  // No layout reads for expired histories or nonvisual combat events. Cache the
  // contact point for an effect's lifetime so deaths/respawns cannot move it.
  const fresh=effects.filter(x=>!anchors.current.has(x.e.seq)&&now>=x.e.shownAt&&now-x.e.shownAt<x.lifetime);
  if(host&&fresh.length){const root=host.getBoundingClientRect();if(root.width&&root.height){
   const measured=new Map<string,Anchor>();
   for(const x of fresh){const selector=x.player?'.character-sprite':`[data-monster-slot="${x.e.slot}"] .four-monster-art`;let anchor=measured.get(selector);
    if(!anchor){const node=host.querySelector(selector);if(!node)continue;const r=node.getBoundingClientRect();anchor={left:`${(r.left-root.left+r.width/2)/root.width*100}%`,top:`${(r.top-root.top+r.height*.55)/root.height*100}%`};measured.set(selector,anchor);}
    anchors.current.set(x.e.seq,anchor);
   }
  }}
  setClock(now);
 },[effects,arena]);
 useEffect(()=>{
  let raf=0,last='';
  const tick=(now:number)=>{
   const active=effects.filter(x=>now>=x.e.shownAt&&now-x.e.shownAt<x.lifetime);
   // The source atlases normally run at 12 fps. A 60 Hz browser callback must
   // not rerender React or remeasure every actor when no atlas frame changed.
   const signature=active.map(x=>`${x.e.seq}:${x.clips.map(y=>now-x.e.shownAt<y.clip.count/y.clip.fps*1000?importedFrame(y.clip,now-x.e.shownAt):-1).join(',')}`).join('|');
   if(signature!==last){last=signature;setClock(now);}
   if(active.length)raf=requestAnimationFrame(tick);
  };
  raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);
 },[effects]);
 return <>{effects.flatMap(x=>{
  const age=clock-x.e.shownAt,anchor=anchors.current.get(x.e.seq);if(!anchor||age<0||age>=x.lifetime)return [];
  const style:CSSProperties={position:'absolute',pointerEvents:'none',zIndex:12,left:anchor.left,top:anchor.top,transform:'translate(-50%,-65%)'};
  const result=x.clips.flatMap(({id,entry,clip})=>age>=clip.count/clip.fps*1000?[]:[<span key={`${x.e.seq}:${id}`} style={{...style,mixBlendMode:'screen'}} data-effect-code={entry.code}><EffectAtlas clip={clip} age={age}/></span>]);
  return result;
 })}</>;
}
