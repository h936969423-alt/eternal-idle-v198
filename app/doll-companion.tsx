'use client';
import {sceneDoll,isSceneDollEvent} from '@/lib/game/doll-scene';
import raw from '@/lib/game/gamedata.json';
import {DOLL_COLORS} from '@/lib/game/doll-system';
import type {Character} from '@/lib/game/engine';
import type {BattleView} from './use-combat-replay';
export default function DollCompanion({c,view,inspect}:{c:Character;view:BattleView;inspect?:(id:string)=>void}){
 const doll=sceneDoll(c);if(!doll)return null;
 const trigger=[...(view.actions||[])].reverse().find(e=>isSceneDollEvent(c,e)),color=DOLL_COLORS[doll.tier]||'#e6cc80';
 return <button className="doll-companion" data-doll-id={doll.id} style={{color}} onClick={()=>inspect?.(doll.id)} aria-label={`魔法娃娃 ${doll.name}，查看能力`} title={`${doll.name} · 能力生效中`}><span className="doll-ground-shadow"/><span className="doll-companion-body">{doll.src?<img className="doll-companion-art" src={doll.src} alt={doll.name} draggable={false}/>:<span className="doll-companion-art doll-placeholder" role="img" aria-label={doll.name}>🪆</span>}</span><span className="doll-ground-name">{doll.name}</span>{trigger&&<span key={trigger.seq} className={`doll-trigger doll-trigger-${trigger.dollKind||'attack'}`} aria-hidden="true"><i/><b>✦</b></span>}{trigger&&<span key={`label-${trigger.seq}`} className="doll-trigger-label">{trigger.effectName||(trigger.skill&&(raw.skills as Record<string,{n:string}>)[trigger.skill]?.n)||'娃娃能力'}</span>}</button>;
}
