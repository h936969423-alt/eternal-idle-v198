'use client';
import {useEffect,useState} from 'react';
import meta from '@/lib/game/combat-animation.json';
import type {Animations} from './sequence-sprite';
import {AtlasImage} from './sequence-sprite';
export default function MonsterDeath({name,at}:{name:string;at:number}){const [frame,setFrame]=useState(()=>typeof window==='undefined'?0:Math.max(0,Math.floor((performance.now()-at)/125))),forms=(meta as Animations)[name],clip=(forms?.root||forms?.['6'])?.death;useEffect(()=>{const timer=setInterval(()=>setFrame(Math.floor((performance.now()-at)/125)),125);return()=>clearInterval(timer);},[at]);if(!clip||frame>=clip.body.count)return null;return <span className="monster-death-ghost sequence-art" aria-label={`${name}倒下`} style={{aspectRatio:`${clip.body.w}/${clip.body.h}`}}>{clip.shadow&&<AtlasImage atlas={clip.shadow} frame={frame} className="sequence-shadow"/>}<AtlasImage atlas={clip.body} frame={frame} className="sequence-body"/>{clip.weapon&&<AtlasImage atlas={clip.weapon} frame={frame} className="sequence-weapon"/>}</span>;}
