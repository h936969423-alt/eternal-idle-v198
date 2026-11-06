'use client';
import {motionPilot,pilotPlayerAttackFrame} from '@/lib/game/motion-pilot';
import PlayerSpriteFrame from './player-sprite-frame';
import {localContactFrame,localHitOwner} from '@/lib/game/local-hit-sync';
import {useEffect,useMemo,useState,useSyncExternalStore} from 'react';
import {directionalFrames,playerWalkStore,scaledFrame,walkFrames} from '@/lib/game/field-walk';
import clientAttack from '@/lib/game/client-attack.json';
import clientWalk from '@/lib/game/client-walk.json';
import raw from '@/lib/game/gamedata.json';
import amap from '@/lib/game/asset-map.json';
import castSpeeds from '@/lib/game/cast-animation.json';
import {baseItem} from '@/lib/game/gear';
import {activeForm} from '@/lib/game/polymorph';
import type {Character} from '@/lib/game/engine';
import {sunrisePlayerCues} from '@/lib/game/sunrise-player-cues';
import {playerAnimationClips} from '@/lib/game/player-animation';
import {morphCastFor,morphCastAnimationFor,morphAttackFor,morphCastFrames,playerBattleDirection} from '@/lib/game/morph-cast';
import {preloadSprites} from '@/lib/game/preload-sprites';
import {useSunrisePlayerMotion} from './use-sunrise-player-motion';
import {playerCastInterval,type CastIntent} from '@/lib/game/cast-feedback';
import type {BattleView} from './use-combat-replay';
const WALK_FRAME_MS=125;
export default function CombatSprite({c,view,interval,pendingCast,castInterval:serverCastInterval}:{c:Character;view:BattleView;interval:number;pendingCast?:CastIntent;castInterval?:number}){const fixedDirection=playerBattleDirection(view.target),walkState=useSyncExternalStore(playerWalkStore.subscribe,playerWalkStore.get,playerWalkStore.get);const poly=c.polyLook!==false?activeForm(c):undefined,ranged=(raw.items as any)[baseItem(c.equipment.weapon?.id||'')]?.isBow,base=c.cls==='royal'?`royal_${c.gender==='f'?'f':'m'}`:c.cls==='knight'?(c.gender==='f'?'knight_f':'knight_2hsword'):c.cls==='elf'?`elf_${c.gender==='f'?'f':'m'}_${ranged?'ranged':'melee'}`:c.cls==='mage'?(c.gender==='f'?'mage_f':'mage_m'):'darkelf_player',frames=amap.frames as Record<string,string[]>;
 // Forms with directional clips face the target; others fall back to direction 2 inside the lookups.
 const direction=poly?(walkState.facing??fixedDirection):fixedDirection;
 const layoutClip=poly?morphCastFor(poly,direction):undefined,castClip=poly?morphCastAnimationFor(poly,direction):undefined,attackClip=poly?morphAttackFor(poly,direction):undefined;
 const clips=useMemo(()=>playerAnimationClips(base,frames,direction,poly?{...poly.frames,...(attackClip?{attack:attackClip.body}:{}),...(castClip?{skill:castClip.body}:{})}:undefined),[base,poly?.id,direction,castClip,attackClip]);
 // Decode every displayed body and overlay before the first swing, including
 // base classes. Retain every polymorph direction to avoid decoding on turn.
 useEffect(()=>{const paths=new Set([...Object.values(clips).flat(),...(poly?morphCastFrames(poly):[])]);for(const clip of [castClip,attackClip])if(clip)for(const path of [...clip.body,...clip.shadow,...clip.weapon])if(path)paths.add(path);preloadSprites([...paths]);},[clips,castClip,attackClip]);
 const counts=useMemo(()=>Object.fromEntries(Object.entries(clips).map(([k,v])=>[k,v.length])),[clips]),actions=view.actions||[],cues=useMemo(()=>sunrisePlayerCues(actions),[actions]);
 const target=view.arena[view.target||0],contactTarget=target?.hp>0?target:view.arena.find(m=>m.hp>0);
 const local={ownerKey:localHitOwner(c.id,c.zone),targetUid:contactTarget?.uid,targetSlot:view.arena.findIndex(m=>m.uid===contactTarget?.uid),liveTargetUids:view.arena.filter(m=>m.hp>0).map(m=>m.uid),running:c.running,hasTarget:view.arena.some(m=>m.hp>0),blocked:['status_stun','status_freeze','status_stone','sk_abs_barrier'].some(k=>c.buffs[k]?.until>Date.now())||!!ranged&&!Object.entries(c.bag).some(([id,n])=>n>0&&!c.locked?.includes(id)&&(raw.items as any)[baseItem(id)]?.isArrow)};
 const castInterval=playerCastInterval(serverCastInterval,(poly&&(castSpeeds as Record<string,number>)[poly.name])||({knight:1.3,elf:1.2,mage:1,dark:1.4,royal:1.4,dragon:1.3,warrior:1.4,illusion:1} as Record<string,number>)[c.cls]||1.2),pose=useSunrisePlayerMotion(`${c.id}:${c.zone}:${base}:${poly?.id||''}`,cues,{counts,attackSeconds:interval,castSeconds:castInterval},view.hp,pendingCast?.characterId===c.id?pendingCast:undefined,local),seq=clips[pose.kind as keyof typeof clips]?.length?clips[pose.kind as keyof typeof clips]:clips.idle;
 // The player stands on the left; use the matching right-facing attack/cast
 // sheets consistently instead of inferring direction from padded sprite boxes.
 const frame=Math.min(seq.length-1,pose.frame);
 const activeClip=pose.kind==='skill'?(castClip||attackClip):pose.kind==='attack'?attackClip:undefined;
 const weapon=(raw.items as Record<string,{wcat?:string}>)[baseItem(c.equipment.weapon?.id||'')];
 const pilot=poly?.id==='deathknight'?motionPilot.deathknight:!poly&&base==='royal_m'&&['sword','單手劍'].includes(weapon?.wcat||'')?motionPilot.royal:undefined;
 const pilotWalk=pilot?.walk[walkState.direction];
 const walkSeq=useMemo(()=>pilotWalk||(poly?[]:walkFrames((clientWalk as Record<string,{counts:Record<string,number>}>)[base]?.counts,base,walkState.direction)),[pilotWalk,poly?.id,base,walkState.direction]);useEffect(()=>{for(const path of walkSeq){const image=new Image();image.src=path;}},[walkSeq]);// Moving actors show their legs; the hit timing keeps running underneath.
 const animatingWalk=walkState.moving&&pose.kind!=='death'&&pose.kind!=='skill'&&walkSeq.length>0,[walkTick,setWalkTick]=useState(0);useEffect(()=>{if(!animatingWalk)return;const timer=setInterval(()=>setWalkTick(tick=>tick+1),WALK_FRAME_MS);return()=>clearInterval(timer);},[animatingWalk]);const walkSrc=animatingWalk?walkSeq[walkTick%walkSeq.length]:undefined;
 // Base characters use one complete client sprite set; timing still follows the existing clips.
 const facing=walkState.facing??2,spriteSet=poly?undefined:(clientAttack as Record<string,Record<'attack'|'idle'|'hurt'|'death',Record<string,number>>>)[base],fightingKind=pose.kind==='attack'||pose.kind==='skill',spriteKind=fightingKind?'attack':pose.kind==='hurt'||pose.kind==='death'?pose.kind:'idle',clientSeq=useMemo(()=>directionalFrames(spriteSet?.[spriteKind],base,({attack:'a',idle:'i',hurt:'h',death:'d'} as const)[spriteKind],facing),[spriteSet,spriteKind,base,facing]);useEffect(()=>{if(!spriteSet)return;for(const [kind,prefix] of [['attack','a'],['idle','i'],['hurt','h']] as const)for(const path of directionalFrames(spriteSet[kind],base,prefix,facing)){const image=new Image();image.src=path;}},[spriteSet,base,facing]);const clientSrc=walkSrc||!clientSeq.length?undefined:spriteKind==='idle'?clientSeq[Math.floor(performance.now()/180)%clientSeq.length]:clientSeq[scaledFrame(frame,seq.length,clientSeq.length)];
 const pilotAttack=pose.kind==='attack'?pilot?.attack[fixedDirection]:undefined;
 useEffect(()=>{if(pilot)preloadSprites([...pilot.walk.flat(),...pilot.attack.flat()]);},[pilot]);
 const pilotSrc=pilotAttack?.[pilotPlayerAttackFrame(frame,seq.length,localContactFrame(seq.length,interval),poly?[2,2,4,1,1,5]:[4,4,4,3,4,5],poly?5:4)];
 return seq.length?<PlayerSpriteFrame className="character-sprite" data-action={walkSrc?'walk':pose.kind} data-direction={walkSrc?walkState.direction:direction} data-target-uid={pose.targetUid||contactTarget?.uid} data-mirrored={false} data-polymorph={poly?.id} formId={poly?.id} canvas={layoutClip?.layout.viewBox||attackClip?.layout.viewBox} src={walkSrc||pilotSrc||clientSrc||seq[frame]} clip={(walkSrc||pilotSrc)?undefined:activeClip} frame={frame} alt={c.name}/>:null;
}







