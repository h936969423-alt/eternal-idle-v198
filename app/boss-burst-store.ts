'use client';
import {useSyncExternalStore} from 'react';
/** True while the world-boss loot burst plays; the victory dialog waits for it. */
let playing=false;const listeners=new Set<()=>void>();
export function setBossBurstPlaying(value:boolean){if(playing===value)return;playing=value;for(const l of listeners)l();}
export function useBossBurstPlaying(){return useSyncExternalStore(l=>{listeners.add(l);return()=>listeners.delete(l);},()=>playing,()=>false);}
