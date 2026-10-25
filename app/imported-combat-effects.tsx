'use client';
import {useEffect,useState,type CSSProperties, type RefObject} from 'react';
import {importedEffects,importedWeaponEffect,importedFrame,type EffectClip} from '@/lib/game/imported-effects';
import type {Character,CombatEvent} from '@/lib/game/engine';
import type {BattleView} from '@/lib/game/combat-presentation';
import {useCombatEffects} from './combat-effects-context';
export function EffectAtlas({clip,age,width=150}:{clip:EffectClip;age:number;width?:number}){
 const n=importedFrame(clip,age),scale=Math.min(width/clip.width,190/clip.height,1.5),w=clip.width*scale,h=clip.height*scale;
 return <span aria-hidden="true" style={{display:'block',width:w,height:h,backgroundImage:`url(/assets/dasu-v1/${clip.sheet})`,backgroundSize:`${clip.cols*w}px ${Math.ceil(clip.count/clip.cols)*h}px`,backgroundPosition:`-${n%clip.cols*w}px -${Math.floor(n/clip.cols)*h}px`,backgroundRepeat:'no-repeat'}}/>;
}
export default function ImportedCombatEffects({c,view,arena}:{c:Character;view:BattleView;arena:RefObject<HTMLDivElement|null>}){
 const config=useCombatEffects(),[clock,setClock]=useState(0);
 // A single clock drives all active atlases; completed effects do not keep an extra loop alive.
 const events=(view.actions||[]).filter(e=>e.visualPhase!=='launch'&&(!e.visualAt||e.visualAt<=performance.now()));
 useEffect(()=>{let raf=0;const tick=(now:number)=>{setClock(now);if(events.some(e=>now-e.shownAt<3500))raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);},[view.actions]);
 if(!config.enabled||!arena.current)return null;
 const root=arena.current.getBoundingClientRect();
 return <>{events.flatMap(e=>{
 const age=Math.max(0,clock-e.shownAt),triple=e.kind==='magic'&&e.skill==='sk_elf_triple';
 const weapon=importedWeaponEffect(c,config,e),hurt=e.kind==='hurt'&&!e.miss&&!!e.damage&&!e.petUid&&!e.summonUid;
 const tripleIds=triple?importedEffects.triple.filter(id=>importedEffects.entries[id].code==='11764-0'):e.kind==='attack'&&e.skill==='sk_elf_triple'&&!e.miss?importedEffects.triple.filter(id=>importedEffects.entries[id].code==='4394-0'):[];
 const selected=[...(weapon?[weapon.id]:[]),...tripleIds];
 const node=arena.current?.querySelector(triple||hurt?'.character-sprite':`[data-monster-slot="${e.slot}"] .four-monster-art`);if(!node)return [];
 const rect=node.getBoundingClientRect(),style:CSSProperties={position:'absolute',pointerEvents:'none',zIndex:12,left:rect.left-root.left+rect.width/2,top:rect.top-root.top+rect.height*.55,transform:'translate(-50%,-65%)'};
 const result=selected.flatMap(id=>{const entry=importedEffects.entries[id],clip=importedEffects.clips[entry.clip];return age>=clip.count/clip.fps*1000?[]:[<span key={`${e.seq}:${id}`} style={{...style,mixBlendMode:'screen'}} data-effect-code={entry.code}><EffectAtlas clip={clip} age={age}/></span>];});
 const h=importedEffects.hurt.find(h=>h.id===config.hurt);if(hurt&&h&&age<700)result.push(<img key={`hurt:${e.seq}`} src={h.image} alt="受擊特效" style={{...style,width:125,maxHeight:80,objectFit:'contain',top:rect.top-root.top-10}}/>);
 return result;
 })}</>;
}
