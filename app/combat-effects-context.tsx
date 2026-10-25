'use client';
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {initialCombatEffects,type CombatEffectsConfig} from '@/lib/game/imported-effects';
const Context=createContext<CombatEffectsConfig>(initialCombatEffects());
export const useCombatEffects=()=>useContext(Context);
export default function CombatEffectsProvider({children}:{children:ReactNode}){
 const [config,setConfig]=useState(initialCombatEffects);
 useEffect(()=>{let alive=true;async function load(){if(document.hidden)return;try{const r=await fetch('/api/combat-effects',{cache:'no-store'});if(r.ok){const next=await r.json() as CombatEffectsConfig;if(alive)setConfig(next);}}catch{}}
 const updated=(e:Event)=>setConfig((e as CustomEvent<CombatEffectsConfig>).detail);void load();const timer=setInterval(load,15000);window.addEventListener('combat-effects-updated',updated);document.addEventListener('visibilitychange',load);return()=>{alive=false;clearInterval(timer);window.removeEventListener('combat-effects-updated',updated);document.removeEventListener('visibilitychange',load);};},[]);
 return <Context.Provider value={config}>{children}</Context.Provider>;
}
