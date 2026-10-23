'use client';
import {useEffect,useRef,useState} from 'react';
import {sceneSound} from './combat-audio';
import type {Character} from '@/lib/game/engine';
import effects from '@/lib/game/client-effects.json';
export default function SceneTransition({c}:{c:Character}){
 const previous=useRef({id:c.id,poly:c.poly?.id,zone:c.zone}),[burst,setBurst]=useState(0),[frame,setFrame]=useState(0);const clip=effects['230'];
 useEffect(()=>{const old=previous.current;previous.current={id:c.id,poly:c.poly?.id,zone:c.zone};if(old.id!==c.id)return;if(old.poly!==c.poly?.id&&c.polyLook!==false){setBurst(n=>n+1);sceneSound('transform');}},[c.id,c.poly?.id,c.zone,c.polyLook]);
 useEffect(()=>{if(!burst)return;setFrame(0);let f=0,timer:ReturnType<typeof setTimeout>;const next=()=>{timer=setTimeout(()=>{f++;setFrame(f);if(f<clip.frames.length)next();},clip.frames[f].duration);};next();return()=>clearTimeout(timer);},[burst]);
 return burst&&frame<clip.frames.length?<img className="scene-transform-burst" src={clip.frames[frame].src} alt="變身特效"/>:null;
}
