'use client';
import {useEffect,useRef,useState} from 'react';
export type DisplayMode='auto'|'portrait'|'landscape';
const key='eternal-display-mode';
export function resolveLandscape(mode:DisplayMode,width:number,height:number){return mode==='landscape'||mode==='auto'&&(width>=1100||width>=700&&width>height);}
function savedMode():DisplayMode{try{const value=localStorage.getItem(key);return value==='portrait'||value==='landscape'?value:'auto';}catch{return 'auto';}}
export function useDisplayMode(){
 const [mode,setMode]=useState<DisplayMode>('auto');
 const [landscape,setLandscape]=useState(false);
 const modeRef=useRef<DisplayMode>('auto');
 useEffect(()=>{
  let frame=0;
  const apply=(next:DisplayMode)=>{
   modeRef.current=next;
   setMode(prev=>prev===next?prev:next);
   const isLandscape=resolveLandscape(next,window.innerWidth,window.innerHeight);
   setLandscape(prev=>prev===isLandscape?prev:isLandscape);
  };
  const onResize=()=>{
   // Mobile Safari can dispatch many resize events while rotating. Apply only
   // the last viewport size of each frame; do not read storage on every event.
   if(frame)cancelAnimationFrame(frame);
   frame=requestAnimationFrame(()=>{frame=0;apply(modeRef.current);});
  };
  const onChange=(event:Event)=>{
   const detail=(event as CustomEvent<DisplayMode>).detail;
   apply(detail==='portrait'||detail==='landscape'||detail==='auto'?detail:savedMode());
  };
  const onStorage=(event:StorageEvent)=>{if(event.key===key||event.key===null)apply(savedMode());};
  apply(savedMode());
  window.addEventListener('resize',onResize);
  window.addEventListener('orientationchange',onResize);
  window.addEventListener('eternal-display-change',onChange);
  window.addEventListener('storage',onStorage);
  return()=>{
   if(frame)cancelAnimationFrame(frame);
   window.removeEventListener('resize',onResize);
   window.removeEventListener('orientationchange',onResize);
   window.removeEventListener('eternal-display-change',onChange);
   window.removeEventListener('storage',onStorage);
  };
 },[]);
 const change=(next:DisplayMode)=>{
  modeRef.current=next;
  try{localStorage.setItem(key,next);}catch{}
  setMode(prev=>prev===next?prev:next);
  setLandscape(prev=>{const value=resolveLandscape(next,window.innerWidth,window.innerHeight);return prev===value?prev:value;});
  window.dispatchEvent(new CustomEvent('eternal-display-change',{detail:next}));
 };
 return {mode,landscape,setMode:change};
}
export function DisplayModePicker({mode,onChange}:{mode:DisplayMode;onChange:(mode:DisplayMode)=>void}){return <label className="display-mode-picker"><span>畫面檢視</span><select aria-label="畫面檢視" value={mode} onChange={e=>onChange(e.target.value as DisplayMode)}><option value="auto">自動</option><option value="portrait">直式</option><option value="landscape">橫式</option></select></label>;}
