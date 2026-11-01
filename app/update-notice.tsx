'use client';
import {useEffect,useRef} from 'react';
import {toast} from 'sonner';
import {APP_BUILD} from './build-id';
import {isNewerBuild} from '@/lib/game/build-version';

const CHECK_MS=60_000;
/** A page kept open across a deploy keeps its old scripts and styles. Ask once to reload. */
export default function UpdateNotice(){
 const shown=useRef(false);
 useEffect(()=>{
  if(APP_BUILD==='dev')return;
  let stopped=false;
  const check=async()=>{
   if(stopped||shown.current||document.visibilityState!=='visible')return;
   try{
    const r=await fetch('/api/version',{cache:'no-store'});if(!r.ok)return;
    const {build}=await r.json() as {build?:string};
    if(!isNewerBuild(APP_BUILD,build)||shown.current)return;
    shown.current=true;
    toast('有新版本',{id:'new-version',description:'遊戲已更新，重新整理後才會看到最新畫面。',duration:Infinity,action:{label:'重新整理',onClick:()=>location.reload()}});
   }catch{}
  };
  const timer=setInterval(check,CHECK_MS);
  const wake=()=>{void check();};
  document.addEventListener('visibilitychange',wake);window.addEventListener('focus',wake);
  void check();
  return()=>{stopped=true;clearInterval(timer);document.removeEventListener('visibilitychange',wake);window.removeEventListener('focus',wake);};
 },[]);
 return null;
}
