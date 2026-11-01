'use client';
import {useEffect,useRef,useState,type CSSProperties,type RefObject} from 'react';
import type {CombatEvent} from '@/lib/game/engine';
import {RARITY_COLORS,type ItemRarity,type LootNotice} from '@/lib/game/loot-appearance';
import {burstPositions,burstSchedule,groundSpot,lootIconSrc,lootOrigin,planBossBurst,type BurstItem} from '@/lib/game/loot-pickup';
import ItemIcon from './item-icon';
import {setBossBurstPlaying} from './boss-burst-store';

type Point={x:number;y:number};
type Drop={id:string;uid?:string;item:string;rarity:ItemRarity;quantity:number;at:Point;from:Point;phase:'drop'|'rest'|'fly';to?:Point};
type BurstChip=BurstItem&{at:Point;phase:'out'|'rest'|'focus'|'fly';flight:number;finale:boolean};
type Burst={from:Point;chips:BurstChip[]};

const DEATH_DELAY=200,FALL=380,REST=1000,FLIGHT=450,MAX_DROPS=10,BATCH=350,BURST_OUT=520,BURST_REST=1200;
const STALE_MS=1500;

/** Arena-relative percentage of the player sprite's chest; follows the sprite when it walks. */
function playerPoint(arena:HTMLElement|null):Point{
 const box=arena?.getBoundingClientRect(),sprite=arena?.querySelector('.four-player .character-sprite,.four-player')?.getBoundingClientRect();
 if(!box?.width||!sprite?.width)return {x:24,y:55};
 return {x:(sprite.left+sprite.width/2-box.left)/box.width*100,y:(sprite.top+sprite.height*.55-box.top)/box.height*100};
}
/** Pixel offset from `to` back to `from`, for keyframes that start at the origin. */
function offset(arena:HTMLElement|null,from:Point,to:Point){const box=arena?.getBoundingClientRect();return {'--from-x':`${((from.x-to.x)/100)*(box?.width||0)}px`,'--from-y':`${((from.y-to.y)/100)*(box?.height||0)}px`} as CSSProperties;}
const glow=(rarity:ItemRarity)=>RARITY_COLORS[rarity]||'#e5e7eb';

export default function LootPickupEffects({events,arena}:{events:(CombatEvent&{shownAt?:number})[];arena:RefObject<HTMLDivElement|null>}){
 const seen=useRef(new Set<number>()),timers=useRef(new Set<ReturnType<typeof setTimeout>>()),batch=useRef<{notices:LootNotice[];slot:number}|null>(null);
 const [drops,setDrops]=useState<Drop[]>([]),[burst,setBurst]=useState<Burst|null>(null),dropsRef=useRef<Drop[]>([]);
 const commit=(next:Drop[])=>{dropsRef.current=next;setDrops(next);};
 const later=(ms:number,run:()=>void)=>{const t=setTimeout(()=>{timers.current.delete(t);run();},ms);timers.current.add(t);};
 const patchDrop=(id:string,patch:Partial<Drop>|null)=>{const old=dropsRef.current;commit(patch?old.map(d=>d.id===id?{...d,...patch}:d):old.filter(d=>d.id!==id));};
 const clearAll=()=>{for(const t of timers.current)clearTimeout(t);timers.current.clear();batch.current=null;commit([]);setBurst(null);setBossBurstPlaying(false);};

 const startBurst=()=>{const b=batch.current;batch.current=null;if(!b?.notices.length){setBossBurstPlaying(false);return;}
  const from=lootOrigin(b.notices[0],b.slot),list=planBossBurst(b.notices),box=arena.current?.getBoundingClientRect(),aspect=box?.width&&box.height?box.width/box.height:.75;
  const spots=burstPositions(from,list.length,aspect),plan=burstSchedule(list);
  setBurst({from,chips:list.map((item,i)=>({...item,at:spots[i],phase:'out',flight:plan[i].flight,finale:plan[i].finale}))});
  later(BURST_OUT,()=>setBurst(old=>old&&{...old,chips:old.chips.map(c=>({...c,phase:'rest'}))}));
  const begin=BURST_OUT+BURST_REST;let end=begin;
  list.forEach((item,i)=>{const {start,finale,flight}=plan[i],focus=finale?450:0;
   if(finale)later(begin+start,()=>setBurst(old=>old&&{...old,chips:old.chips.map(c=>c.key===item.key?{...c,phase:'focus'}:c)}));
   later(begin+start+focus,()=>{const to=playerPoint(arena.current);setBurst(old=>old&&{...old,chips:old.chips.map(c=>c.key===item.key?{...c,phase:'fly',at:to}:c)});});
   end=Math.max(end,begin+start+focus+flight);});
  later(end+300,()=>{setBurst(null);setBossBurstPlaying(false);});
 };
 const skipBurst=()=>{for(const t of timers.current)clearTimeout(t);timers.current.clear();const to=playerPoint(arena.current);setBurst(old=>old&&{...old,chips:old.chips.map(c=>({...c,phase:'fly',flight:220,at:to}))});later(260,()=>{setBurst(null);setBossBurstPlaying(false);});};

 useEffect(()=>{const now=Date.now(),fresh=events.filter(e=>e.kind==='loot'&&e.loot&&!seen.current.has(e.seq));if(!fresh.length)return;
  for(const e of fresh)seen.current.add(e.seq);if(seen.current.size>640)seen.current=new Set(events.map(e=>e.seq));
  for(const e of fresh){const n=e.loot!;if(typeof document!=='undefined'&&document.hidden)continue;
   // Animations restored after a remount would replay old kills; only fresh loot is shown.
   if(e.shownAt!==undefined&&now-e.shownAt>STALE_MS)continue;
   if(n.layout!=='ordinary'){setBossBurstPlaying(true);if(!batch.current){batch.current={notices:[],slot:e.slot||0};later(BATCH,startBurst);}batch.current.notices.push(n);continue;}
   const from=lootOrigin(n,e.slot||0),old=dropsRef.current;
   const merge=old.length>=MAX_DROPS?old.find(d=>d.item===n.item&&d.phase!=='fly'):undefined;
   if(merge){commit(old.map(d=>d===merge?{...d,quantity:d.quantity+n.quantity}:d));continue;}
   if(old.length>=MAX_DROPS)continue;
   const same=old.filter(d=>d.uid&&d.uid===e.uid&&d.phase!=='fly').length,id=`${e.seq}`;
   commit([...old,{id,uid:e.uid,item:n.item,rarity:n.rarity,quantity:n.quantity,from:{x:from.x,y:from.y-10},at:groundSpot(from,same),phase:'drop'}]);
   later(DEATH_DELAY+FALL,()=>patchDrop(id,{phase:'rest'}));later(DEATH_DELAY+FALL+REST,()=>patchDrop(id,{phase:'fly',to:playerPoint(arena.current)}));later(DEATH_DELAY+FALL+REST+FLIGHT+60,()=>patchDrop(id,null));
  }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[events]);
 useEffect(()=>{const hide=()=>{if(document.hidden)clearAll();};document.addEventListener('visibilitychange',hide);return()=>{document.removeEventListener('visibilitychange',hide);clearAll();};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);

 return <>
  {drops.map(d=>{const at=d.phase==='fly'&&d.to?d.to:d.at,src=lootIconSrc(d.item);return <div key={d.id} className="loot-pickup" data-phase={d.phase} data-rarity={d.rarity} style={{left:`${at.x}%`,top:`${at.y}%`,'--loot-glow':glow(d.rarity),'--loot-flight':`${FLIGHT}ms`,...(d.phase==='drop'?offset(arena.current,d.from,d.at):{})} as CSSProperties} aria-hidden="true"><span className="loot-plate" data-rarity={d.rarity}>{src?<ItemIcon src={src} alt="" size={28} loading="eager"/>:<span className="loot-pickup-dot"/>}</span>{d.quantity>1&&<b>×{d.quantity}</b>}</div>;})}
  {burst&&<div className="loot-burst" role="button" tabIndex={0} aria-label="跳過掉落動畫" onClick={skipBurst} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')skipBurst();}}>
   {burst.chips.map(c=>{const src=lootIconSrc(c.item);return <div key={c.key} className="loot-burst-chip" data-phase={c.phase} data-finale={c.finale||undefined} data-rarity={c.rarity} style={{left:`${c.at.x}%`,top:`${c.at.y}%`,'--loot-glow':glow(c.rarity),'--loot-flight':`${c.flight}ms`,...(c.phase==='out'?offset(arena.current,burst.from,c.at):{})} as CSSProperties}>
    <i className="loot-pillar"/><span className="loot-plate" data-rarity={c.rarity}>{src?<ItemIcon src={src} alt="" size={32} loading="eager"/>:<span className="loot-pickup-dot"/>}</span>{c.extra?<b>+{c.extra}</b>:c.quantity>1&&<b>×{c.quantity}</b>}{c.phase==='focus'&&<span className="loot-burst-name">{c.name}{c.quantity>1?` ×${c.quantity}`:''}</span>}</div>;})}
   <span className="loot-burst-skip">點擊跳過</span>
  </div>}
 </>;
}
