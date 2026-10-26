'use client';
import PlayerSpriteFrame from './player-sprite-frame';
import {useEffect,useState} from 'react';
import {sceneBackground} from '@/lib/game/scene-presentation';
import {activeForm} from '@/lib/game/polymorph';
import amap from '@/lib/game/asset-map.json';
import type {Character} from '@/lib/game/engine';
import SceneTransition from './scene-transition';
import MagicEffect from './magic-effect';
import type {BattleView} from './use-combat-replay';
export default function TownWalker({c,view}:{c:Character;view?:BattleView}){const [frame,setFrame]=useState(0),poly=c.polyLook!==false?activeForm(c):undefined;const idle=poly?.frames.idle||(amap.frames as Record<string,string[]>)[c.cls==='royal'?`royal_${c.gender==='f'?'f':'m'}/idle`:c.cls==='knight'?(c.gender==='f'?'knight_f/idle':'knight_2hsword/idle'):c.cls==='elf'?`elf_${c.gender==='f'?'f':'m'}_melee/idle`:c.cls==='mage'?`mage_${c.gender==='f'?'f':'m'}/idle`:'darkelf/idle']||[];const frames=idle;
 useEffect(()=>{setFrame(0);const timer=setInterval(()=>setFrame(n=>n+1),180);return()=>clearInterval(timer);},[c.id,poly?.id]);
 return <div className="town-walk-scene" style={{backgroundImage:`url('${sceneBackground(c.zone)}')`}} aria-label="村莊場景"><div className="town-walk-actor" style={{left:"24%",top:"62%"}}>{frames.length>0&&<PlayerSpriteFrame className="town-player-sprite" src={frames[frame%frames.length]} formId={poly?.id} alt={c.name}/>}<SceneTransition c={c}/>{(view?.casts||[]).filter(e=>e.slot===undefined&&e.source!=="monster").map(e=><MagicEffect key={e.seq} event={e}/>)}<small>{c.name}</small></div></div>;
}

