'use client';
import {useEffect,useRef,useState} from 'react';
import type {CombatEvent} from '@/lib/game/engine';
import {dragon381Position,monsterPosition,worldBossPosition} from '@/lib/game/battle-layout';
import {enqueueLoot,type QueuedLoot} from '@/lib/game/loot-queue';
import {LootVisual} from './loot-visual';
export default function LootEffects({events}:{events:CombatEvent[]}){const seen=useRef(new Set<number>()),[queue,setQueue]=useState<QueuedLoot[]>([]),[active,setActive]=useState<QueuedLoot|null>(null);
 useEffect(()=>{const fresh=events.filter(e=>e.kind==='loot'&&!seen.current.has(e.seq));if(!fresh.length)return;for(const e of fresh)seen.current.add(e.seq);if(seen.current.size>640)seen.current=new Set(events.filter(e=>e.kind==='loot').map(e=>e.seq));setQueue(old=>enqueueLoot(fresh,0,old).queue);},[events]);
 useEffect(()=>{if(active||!queue.length)return;setActive(queue[0]);setQueue(old=>old.slice(1));},[active,queue]);
 useEffect(()=>{if(!active)return;const timer=setTimeout(()=>setActive(null),active.loot.style.durationMs+80);return()=>clearTimeout(timer);},[active]);
 useEffect(()=>{const hide=()=>{if(document.hidden){setQueue([]);setActive(null);}};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[]);
 if(!active)return null;const notice=active.loot,p=notice.style.position==='player'?{x:24,y:52}:(notice.layout==='ordinary'&&notice.spawnPoint)|| (notice.layout==='dragon'?dragon381Position:notice.layout==='boss'?worldBossPosition:monsterPosition)(active.slot||0,notice.slots);return <div className="loot-anchor" style={{left:`clamp(var(--loot-safe,96px), ${p.x}%, calc(100% - var(--loot-safe,96px)))`,top:`${notice.style.position==='player'?p.y:Math.max(15,p.y-14)}%`}}><LootVisual key={active.seq} notice={notice}/></div>;
}
