'use client';
import {useEffect,useState} from 'react';
import {W_SKILLS} from '@/lib/game/lineagew-skill-data';
import type {Encounter} from '@/lib/game/engine';
const labels:Record<string,string>={holyBarrier:'聖結界',sk_holy_barrier:'聖結界',holyBarrierLock:'破界',revealed:'標記',slow:'緩速',poison:'中毒',disease:'防禦降低',weak:'衰弱',silence:'沉默',blind:'失明',noRegen:'禁療',vulnerable:'易傷',stun:'暈眩',freeze:'冰凍',sleep:'睡眠',paralyze:'束縛',mrDown:'魔防降低',muddywater:'恢復降低',lwMark:'黑暗標記'};
const iconIds:Record<string,string>={holyBarrier:'350',sk_holy_barrier:'350',holyBarrierLock:'11603',revealed:'630',slow:'12970',poison:'9510',disease:'18608',weak:'10910',silence:'480',blind:'18176',noRegen:'11197',vulnerable:'9660',stun:'400',freeze:'290',sleep:'360',paralyze:'13372',mrDown:'470',muddywater:'560',lwMark:'18202'};
export default function MythicTargetStatus({target}:{target:Encounter}){
 const [now,setNow]=useState(()=>Date.now()),effects=target.effects;
 useEffect(()=>{let timer:ReturnType<typeof setTimeout>;const update=()=>{const time=Date.now();setNow(time);const next=Math.min(...Object.keys(labels).map(k=>effects?.[k]?.until||0).filter(at=>at>time));if(Number.isFinite(next))timer=setTimeout(update,Math.max(1,next-time+1));};update();return()=>clearTimeout(timer);},[effects]);
 if(target.hp<=0)return null;
 return <span className="mythic-target-status">{Object.entries(labels).filter(([key])=>(effects?.[key]?.until||0)>now&&(!(key==='holyBarrier'||key==='sk_holy_barrier')||!(effects?.holyBarrierLock?.until!>now))).map(([key,name])=>{const icon=W_SKILLS['lw_skill_'+iconIds[key]]?.lwIcon;return <span key={key} title={`${name} · ${Math.ceil((effects![key].until-now)/1000)} 秒`} aria-label={name}>{icon?<img src={icon} alt={name} style={{width:20,height:20,objectFit:'contain',border:0,background:'transparent'}}/>:<small>{name}</small>}</span>;})}</span>;
}
