'use client';
import {useEffect,useState} from 'react';
import type {Encounter} from '@/lib/game/engine';
export default function MythicTargetStatus({target}:{target:Encounter}){
 const [now,setNow]=useState(()=>Date.now()),effects=target.effects;
 useEffect(()=>{let timer:ReturnType<typeof setTimeout>;const update=()=>{const time=Date.now();setNow(time);const next=Math.min(...['holyBarrier','sk_holy_barrier','holyBarrierLock','revealed','slow','poison','disease','weak','silence','blind','noRegen','vulnerable'].map(k=>effects?.[k]?.until||0).filter(at=>at>time));if(Number.isFinite(next))timer=setTimeout(update,Math.max(1,next-time+1));};update();return()=>clearTimeout(timer);},[effects]);
 if(target.hp<=0)return null;
 const active=(key:string)=>(effects?.[key]?.until||0)>now;
 return <span className="mythic-target-status">{(active('holyBarrier')||active('sk_holy_barrier'))&&!active('holyBarrierLock')&&<small>聖結界</small>}{active('holyBarrierLock')&&<small className="dispel">破界</small>}{active('revealed')&&<small className="reveal">揭露</small>}{active('slow')&&<small className="lw-status-ice">緩速</small>}{active('poison')&&<small className="lw-status-venom">中毒</small>}{(['disease','weak','silence','blind','noRegen','vulnerable'] as const).filter(active).map(k=><small key={k}>{({disease:'疾病',weak:'衰弱',silence:'沉默',blind:'失明',noRegen:'禁療',vulnerable:'易傷'})[k]}</small>)}</span>;
}
