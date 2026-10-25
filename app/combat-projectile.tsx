'use client';
import {useEffect,useState,type RefObject} from 'react';
import raw from '@/lib/game/gamedata.json';
import {magicVisual,magicDirection,magicFlightMs} from '@/lib/game/magic-visuals';
import {combatArrowFlight,arrowSprite} from '@/lib/game/player-sprite-layout';
import {projectileCount} from '@/lib/game/animation-clock';
import {baseItem} from '@/lib/game/gear';
import type {Character,CombatEvent} from '@/lib/game/engine';
export default function CombatProjectile({event,c,arena,interval}:{event:CombatEvent;c:Character;interval:number;arena:RefObject<HTMLDivElement|null>}){
 const [shots,setShots]=useState<{x:number;y:number;src:string;flip:boolean;width:number;blend:'screen'|'normal';angle:number}[]>([]);
 useEffect(()=>{const root=arena.current,player=root?.querySelector(event.source==='doll'?'.doll-companion-art':'.character-sprite'),monster=root?.querySelector(`[data-monster-slot="${event.slot}"] .four-monster-art`);if(event.visualPhase==='impact'||!root||!player||!monster||monster.closest('[data-monster-uid]')?.getAttribute('data-monster-uid')!==event.uid||event.source==='summon'||event.source==='poison'||event.source==='pet')return;
 const {config}=magicVisual(event),weapon=(raw.items as any)[baseItem(c.equipment.weapon?.id||'')],arrow=event.source!=='doll'&&(!event.skill||event.skill==='sk_elf_triple')&&(weapon?.isBow||event.magicProjectile)&&!event.weaponProc&&event.source!=='magic';if(!arrow&&!config?.proj)return;
 const r=root.getBoundingClientRect(),p=player.getBoundingClientRect(),m=monster.getBoundingClientRect(),from={x:p.left-r.left+p.width*.6,y:p.top-r.top+p.height*.55},to={x:m.left-r.left+m.width/2,y:m.top-r.top+m.height*.55};
 const facing=config?magicDirection(config,to.x-from.x,to.y-from.y):undefined;
 let frames:string[]=facing?.frames||[],flip=facing?.flip||false;
 if(arrow)frames=[event.magicProjectile?'/assets/effects/arrows/special/0.png':arrowSprite(event.polyName,c.polyLook!==false)];
 const flight=combatArrowFlight(from,to,interval,event.skill),delay=arrow?flight.delay:0;
 if(!frames.length)return;
 const duration=event.visualFlightMs??(arrow?flight.duration:magicFlightMs(Math.hypot(to.x-from.x,to.y-from.y))),count=projectileCount(),start=event.visualAt??performance.now();let request=0;
 const tick=(now:number)=>{const age=now-start;const visible=[];for(let i=0;i<count;i++){const elapsed=age-delay-i*70;if(elapsed<0||elapsed>=duration)continue;const t=elapsed/duration;visible.push({angle:arrow?flight.angle:0,x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t,src:frames[Math.floor(elapsed/(arrow?70:1000/(config?.fps||12)))%frames.length],flip,width:arrow?28:Math.min(100,(config?.nw||50)*(config?.projScale||1)),blend:!arrow&&config?.blend==='screen'?'screen' as const:'normal' as const});}setShots(visible);if(age<delay+duration+(count-1)*70)request=requestAnimationFrame(tick);};request=requestAnimationFrame(tick);return()=>cancelAnimationFrame(request);
 },[event.seq]);
 return <>{shots.map((shot,i)=><img key={i} className="combat-projectile" src={shot.src} alt="" style={{mixBlendMode:shot.blend,left:shot.x,top:shot.y,width:shot.width,transform:`translate(-50%,-50%) rotate(${shot.angle}deg) scaleX(${shot.flip?-1:1})`}}/>)}</>;
}
