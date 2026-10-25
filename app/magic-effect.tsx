'use client';
import LineageWEquipmentEffect from './lineagew-equipment-effect';
import {lineageWEffectDefinition} from '@/lib/game/lineagew-equipment-effects';
import MythicWeaponEffect from './mythic-weapon-effect';
import {mythicProcDefinition} from '@/lib/game/lineagew-mythic-procs';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {magicVisual,magicDirection,magicFrame} from '@/lib/game/magic-visuals';
import {targetSpellLayout} from '@/lib/game/spell-effect-layout';
import {sceneBlend} from '@/lib/game/scene-presentation';
import type {CombatEvent} from '@/lib/game/engine';

export default function MagicEffect({event,loopUntil}:{event:CombatEvent;loopUntil?:number}){
 const host=useRef<HTMLSpanElement>(null),[frame,setFrame]=useState(0);
 const {name,config}=magicVisual(event);
 const [placement,setPlacement]=useState<{left?:number;top?:number;width?:number;height?:number;frames?:string[];shadow?:string[];flip?:boolean}>({});
 const count=config?Math.max(0,config.frames.length,...(config.layers||[]).map(layer=>layer.length)):0;
 useEffect(()=>{
  setFrame(0);setPlacement({});
  if(!config||!count||config.proj&&event.source!=='monster')return;
  const parent=host.current?.parentElement,root=parent?.closest('.static-arena'),sprite=parent?.querySelector(config.self?'.character-sprite':config.atlas&&event.slot!==undefined?`[data-monster-slot="${event.slot}"] .four-monster-art`:'.four-monster-art'),caster=root?.querySelector('.character-sprite');
  const position=()=>{if(config.imported&&parent&&(sprite||config.atlas)){
   const box=parent.getBoundingClientRect(),r=sprite?.getBoundingClientRect()||{left:box.left+box.width*.5,top:box.top+box.height*.6,width:0,height:0},p=caster?.getBoundingClientRect();
   const facing=magicDirection(config,r.left+r.width*.5-(p?p.left+p.width*.6:r.left),r.top+r.height*.55-(p?p.top+p.height*.55:r.top+r.height));
   setPlacement(config.atlas?targetSpellLayout(config.atlas,box,r,root?.getBoundingClientRect()||box,config.targetVc):{left:r.left-box.left+r.width*.5,top:r.top-box.top+r.height*(config.oh ? .15 : config.targetVc??.55),...facing});
  }};
  position();
  const observer=config.atlas&&typeof ResizeObserver!=='undefined'?new ResizeObserver(position):undefined;
  if(observer&&(root||parent))observer.observe((root||parent)!);
  let request=0;
  const started=event.visualAt??performance.now();
  // Animation is usually 8–15 fps; don't force a React render on every 60 Hz
  // display frame. Update only when the visible sprite frame actually changes.
  let lastIndex=0;
  const tick=(now:number)=>{
   const expired=!!loopUntil&&Date.now()>=loopUntil;
   const index=expired?-1:magicFrame(now-started,config.fps,count,!!loopUntil);
   if(index!==lastIndex){lastIndex=index;setFrame(index);}
   if(index>=0)request=requestAnimationFrame(tick);
  };
  const visibility=()=>{
   if(document.hidden){cancelAnimationFrame(request);setFrame(-1);}
   else if(loopUntil&&Date.now()<loopUntil)request=requestAnimationFrame(tick);
  };
  document.addEventListener('visibilitychange',visibility);
  if(!document.hidden)request=requestAnimationFrame(tick);else setFrame(-1);
  return()=>{cancelAnimationFrame(request);observer?.disconnect();document.removeEventListener('visibilitychange',visibility);};
 },[event.seq,loopUntil,config,count]);
 if(lineageWEffectDefinition(event.skill))return <LineageWEquipmentEffect event={event}/>;
 if(mythicProcDefinition(event.skill))return <MythicWeaponEffect event={event}/>;
 if(!config||config.proj&&event.source!=='monster'||frame<0||!loopUntil&&frame>=count)return null;
 if(config.atlas){
  const a=config.atlas;if(!placement.width||!placement.height)return <span ref={host} style={{display:'contents'}}/>;
  const index=frame%a.count,w=placement.width,h=placement.height;
  return <span ref={host} style={{display:'contents'}}><span className="magic-effect magic-target-atlas" role="img" aria-label={`${name}施法特效`} style={{position:'absolute',pointerEvents:'none',left:placement.left,top:placement.top,width:w,height:h,maxWidth:'none',maxHeight:'none',transform:'none',backgroundImage:`url(${a.src})`,backgroundSize:`${a.cols*w}px ${Math.ceil(a.count/a.cols)*h}px`,backgroundPosition:`-${index%a.cols*w}px -${Math.floor(index/a.cols)*h}px`,backgroundRepeat:'no-repeat',mixBlendMode:sceneBlend(config.blend)}}/></span>;
 }
 const style:CSSProperties=config.imported?{
  left:placement.left??'50%',top:placement.top??(config.oh?'15%':'50%'),
  width:config.w?120*config.w:config.h?'auto':config.width||120,
  height:config.h?120*config.h:undefined,maxHeight:'none',
  transform:`translate(-${100*(config.ax??.5)}%,-${100*(config.ay??.5)}%)${placement.flip?' scaleX(-1)':''}`,
 }:{width:config.width,top:config.oh?'15%':'50%',height:config.h?`${Math.min(210,120*config.h)}px`:undefined};
 const layers=[...(placement.shadow||config.shadowFrames?[{frames:placement.shadow||config.shadowFrames!,shadow:true}]:[]),{frames:placement.frames||config.frames,shadow:false},...(config.layers||[]).map(frames=>({frames,shadow:false}))];
 return <span ref={host} style={{display:'contents'}}>{layers.map(({frames,shadow},i)=>frames.length&&(loopUntil||frame<frames.length)?<img key={i} className="magic-effect" src={frames[frame%frames.length]} style={{...style,mixBlendMode:shadow?'normal':sceneBlend(config.blend)}} alt={shadow?'':`${name}施法特效`}/>:null)}</span>;
}

