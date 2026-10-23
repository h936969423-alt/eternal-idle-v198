'use client';
import LineageWEquipmentEffect from './lineagew-equipment-effect';
import {lineageWEffectDefinition} from '@/lib/game/lineagew-equipment-effects';
import MythicWeaponEffect from './mythic-weapon-effect';
import {mythicProcDefinition} from '@/lib/game/lineagew-mythic-procs';
import {useEffect,useState} from 'react';
import fx from '@/lib/game/magic-fx.json';
import raw from '@/lib/game/gamedata.json';
import {sceneBlend} from '@/lib/game/scene-presentation';
import type {CombatEvent} from '@/lib/game/engine';
type EffectConfig={frames:string[];fps:number;self:boolean;proj?:number;layers?:string[][];oh?:number;h?:number;width?:number;blend?:string};
export default function MagicEffect({event,loopUntil}:{event:CombatEvent;loopUntil?:number}){
 const [frame,setFrame]=useState(0),name=event.effectName||(event.skill?(raw.skills as Record<string,any>)[event.skill]?.n:event.item?((raw.items as Record<string,any>)[event.item]?.eff==='magicbarrier'?'魔法屏障':(raw.items as Record<string,any>)[event.item]?.n):''),config=(fx as Record<string,EffectConfig>)[name];
 const count=config?Math.max(0,config.frames.length,...(config.layers||[]).map(layer=>layer.length)):0;
 useEffect(()=>{setFrame(0);if(!config||!count)return;let request=0;const started=performance.now();const tick=(now:number)=>{const index=Math.floor((now-started)*config.fps/1000);setFrame(index);if(loopUntil?Date.now()<loopUntil:index<count)request=requestAnimationFrame(tick);};request=requestAnimationFrame(tick);return()=>cancelAnimationFrame(request);},[event.seq,loopUntil,config,count]);
 if(lineageWEffectDefinition(event.skill))return <LineageWEquipmentEffect event={event}/>;
 if(mythicProcDefinition(event.skill))return <MythicWeaponEffect event={event}/>;
 if(!config||(config.proj&&event.source!=='monster')||(loopUntil?Date.now()>=loopUntil:frame>=count))return null;
 return <>{[config.frames,...(config.layers||[])].map((frames,i)=>frames.length&&(loopUntil||frame<frames.length)?<img key={i} className="magic-effect" src={frames[loopUntil?frame%frames.length:frame]} style={{mixBlendMode:sceneBlend(config.blend),width:config.width,top:config.oh?'15%':'50%',height:config.h?`${Math.min(210,120*config.h)}px`:undefined}} alt={`${name}施法特效`}/>:null)}</>;
}
