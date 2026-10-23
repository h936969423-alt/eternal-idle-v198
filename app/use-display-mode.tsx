'use client';
import {useEffect,useState} from 'react';
export type DisplayMode='auto'|'portrait'|'landscape';
const key='eternal-display-mode';
export function resolveLandscape(mode:DisplayMode,width:number,height:number){return mode==='landscape'||mode==='auto'&&(width>=1100||width>=700&&width>height);}
export function useDisplayMode(){
 const [mode,setMode]=useState<DisplayMode>('auto'),[landscape,setLandscape]=useState(false);
 useEffect(()=>{
  const update=(event?:Event)=>{let next:DisplayMode='auto';try{const saved=localStorage.getItem(key);if(saved==='portrait'||saved==='landscape')next=saved;}catch{}if(event?.type==='eternal-display-change')next=(event as CustomEvent<DisplayMode>).detail;
   setMode(next);setLandscape(resolveLandscape(next,window.innerWidth,window.innerHeight));};
  update();window.addEventListener('resize',update);window.addEventListener('eternal-display-change',update);window.addEventListener('storage',update);
  return()=>{window.removeEventListener('resize',update);window.removeEventListener('eternal-display-change',update);window.removeEventListener('storage',update);};
 },[]);
 const change=(next:DisplayMode)=>{try{localStorage.setItem(key,next);}catch{}setMode(next);setLandscape(resolveLandscape(next,window.innerWidth,window.innerHeight));window.dispatchEvent(new CustomEvent('eternal-display-change',{detail:next}));};
 return {mode,landscape,setMode:change};
}
export function DisplayModePicker({mode,onChange}:{mode:DisplayMode;onChange:(mode:DisplayMode)=>void}){return <label className="display-mode-picker"><span>畫面檢視</span><select aria-label="畫面檢視" value={mode} onChange={e=>onChange(e.target.value as DisplayMode)}><option value="auto">自動</option><option value="portrait">直式</option><option value="landscape">橫式</option></select></label>;}
