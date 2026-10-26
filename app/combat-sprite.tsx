'use client';
import PlayerSpriteFrame from './player-sprite-frame';
import {localHitOwner} from '@/lib/game/local-hit-sync';
import {useMemo,useEffect} from 'react';
import raw from '@/lib/game/gamedata.json';
import amap from '@/lib/game/asset-map.json';
import castSpeeds from '@/lib/game/cast-animation.json';
import {baseItem} from '@/lib/game/gear';
import {activeForm} from '@/lib/game/polymorph';
import type {Character} from '@/lib/game/engine';
import {sunrisePlayerCues} from '@/lib/game/sunrise-player-cues';
import {playerAnimationClips} from '@/lib/game/player-animation';
import {morphCastFor,morphAttackFor,playerBattleDirection,morphCastLayers} from '@/lib/game/morph-cast';
import {preloadSprites} from '@/lib/game/preload-sprites';
import {useSunrisePlayerMotion} from './use-sunrise-player-motion';
import {playerCastInterval,type CastIntent} from '@/lib/game/cast-feedback';
import type {BattleView} from './use-combat-replay';
export default function CombatSprite({c,view,interval,pendingCast,castInterval:serverCastInterval}:{c:Character;view:BattleView;interval:number;pendingCast?:CastIntent;castInterval?:number}){const poly=c.polyLook!==false?activeForm(c):undefined,ranged=(raw.items as any)[baseItem(c.equipment.weapon?.id||'')]?.isBow,base=c.cls==='royal'?`royal_${c.gender==='f'?'f':'m'}`:c.cls==='knight'?(c.gender==='f'?'knight_f':'knight_2hsword'):c.cls==='elf'?`elf_${c.gender==='f'?'f':'m'}_${ranged?'ranged':'melee'}`:c.cls==='mage'?(c.gender==='f'?'mage_f':'mage_m'):'darkelf',frames=amap.frames as Record<string,string[]>,direction=playerBattleDirection(view.target,poly);
 const castClip=poly?morphCastFor(poly,direction):undefined,attackClip=poly?morphAttackFor(poly,direction):undefined;
 const clips=useMemo(()=>playerAnimationClips(base,frames,direction,poly?{...poly.frames,...(attackClip?{attack:attackClip.body}:{}),...(castClip?{skill:castClip.body}:{})}:undefined),[base,poly?.id,direction,castClip,attackClip]);
 // Decode every displayed body and overlay before the first swing, including
 // base classes. Only the active battle direction needs layered frames.
 useEffect(()=>{const paths=new Set(Object.values(clips).flat());for(const clip of [castClip,attackClip])if(clip)for(const path of [...clip.body,...clip.shadow,...clip.weapon])if(path)paths.add(path);preloadSprites([...paths]);},[clips,castClip,attackClip]);
 const counts=useMemo(()=>Object.fromEntries(Object.entries(clips).map(([k,v])=>[k,v.length])),[clips]),actions=view.actions||[],cues=useMemo(()=>sunrisePlayerCues(actions),[actions]);
 const target=view.arena[view.target||0],contactTarget=target?.hp>0?target:view.arena.find(m=>m.hp>0);
 const local={ownerKey:localHitOwner(c.id,c.zone),targetUid:contactTarget?.uid,running:c.running,hasTarget:view.arena.some(m=>m.hp>0),blocked:['status_stun','status_freeze','status_stone','sk_abs_barrier'].some(k=>c.buffs[k]?.until>Date.now())||!!ranged&&!Object.entries(c.bag).some(([id,n])=>n>0&&!c.locked?.includes(id)&&(raw.items as any)[baseItem(id)]?.isArrow)};
 const castInterval=playerCastInterval(serverCastInterval,(poly&&(castSpeeds as Record<string,number>)[poly.name])||({knight:1.3,elf:1.2,mage:1,dark:1.4,royal:1.4,dragon:1.3,warrior:1.4,illusion:1} as Record<string,number>)[c.cls]||1.2),pose=useSunrisePlayerMotion(`${c.id}:${c.zone}:${base}:${poly?.id||''}`,cues,{counts,attackSeconds:interval,castSeconds:castInterval},view.hp,pendingCast?.characterId===c.id?pendingCast:undefined,local),seq=clips[pose.kind as keyof typeof clips]?.length?clips[pose.kind as keyof typeof clips]:clips.idle;
 const frame=Math.min(seq.length-1,pose.frame);
 const activeClip=pose.kind==='skill'?castClip:pose.kind==='attack'?attackClip:undefined;
 return seq.length?<PlayerSpriteFrame className="character-sprite" data-action={pose.kind} data-direction={direction} data-polymorph={poly?.id} formId={poly?.id} src={seq[frame]} clip={activeClip} frame={frame} alt={c.name}/>:null;
}





