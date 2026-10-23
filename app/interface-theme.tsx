'use client';
import {useEffect} from 'react';
import {interfacePreferences} from '@/lib/interface-preferences';
export default function InterfaceTheme(){useEffect(()=>{const apply=(e?:Event)=>document.body.classList.toggle('ice-blue',((e as CustomEvent|undefined)?.detail?.theme||interfacePreferences().theme)==='ice');const storage=(e:StorageEvent)=>{if(e.key==='eternal-interface'||e.key===null)apply();};apply();window.addEventListener('eternal-interface-change',apply);window.addEventListener('storage',storage);return()=>{window.removeEventListener('eternal-interface-change',apply);window.removeEventListener('storage',storage);};},[]);return null;}
