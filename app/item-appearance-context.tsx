'use client';
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import type {LootAppearanceConfig} from '@/lib/game/loot-appearance';
const ItemAppearanceContext=createContext<LootAppearanceConfig|undefined>(undefined);
export const useItemAppearance=()=>useContext(ItemAppearanceContext);
export function ItemAppearanceProvider({config,children}:{config?:LootAppearanceConfig;children:ReactNode}){return <ItemAppearanceContext.Provider value={config}>{children}</ItemAppearanceContext.Provider>;}
export function GmItemAppearanceProvider({children}:{children:ReactNode}){
 const [config,setConfig]=useState<LootAppearanceConfig>();
 useEffect(()=>{let active=true;const load=async()=>{try{const r=await fetch('/api/gm/item-appearance',{cache:'no-store'});if(r.ok){const next=await r.json();if(active)setConfig(next as LootAppearanceConfig);}}catch{}};const update=(event:Event)=>{const next=(event as CustomEvent<LootAppearanceConfig>).detail;if(next)setConfig(next as LootAppearanceConfig);};void load();window.addEventListener('item-appearance-updated',update);return()=>{active=false;window.removeEventListener('item-appearance-updated',update);};},[]);
 return <ItemAppearanceProvider config={config}>{children}</ItemAppearanceProvider>;
}
