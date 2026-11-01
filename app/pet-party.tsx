'use client';
import CompanionHasteControl from './companion-haste-control';
import {companionHasteUntil} from '@/lib/game/companion-haste';
import {useEffect,useMemo,useState,type RefObject} from 'react';
import {Button} from '@/components/ui/button';
import type {Character,PetSnapshot} from '@/lib/game/engine';
import {petSnapshot} from '@/lib/game/engine';
import {petCues} from '@/lib/game/animation-cues';
import {facing} from '@/lib/game/animation-clock';
import type {BattleView} from './use-combat-replay';
import {SequenceSprite} from './sequence-sprite';
import assets from '@/lib/game/asset-map.json';
import {MONSTER_ANCHOR} from './monster-anchor';
function ScenePet({p,view,index,running,arena}:{p:PetSnapshot;view:BattleView;index:number;running:boolean;arena:RefObject<HTMLDivElement|null>}){const [position,setPosition]=useState({x:p.x??20+index*8,y:p.y??74+index%2*6,direction:3,moving:false}),actions=view.actions||[],cues=useMemo(()=>petCues(actions,p.uid),[actions,p.uid]);
 useEffect(()=>{const timer=setInterval(()=>{const root=arena.current,box=root?.getBoundingClientRect(),target=root?.querySelector(`[data-monster-slot="${(p.targetUid?view.arena.findIndex(m=>m.uid===p.targetUid):-1)}"] ${MONSTER_ANCHOR}`)?.getBoundingClientRect();if(!box?.width)return;setPosition(old=>{if(p.hp<=0||!running)return old.moving?{...old,moving:false}:old;if(!target){const x=p.x??old.x,y=p.y??old.y,dx=x-old.x,dy=y-old.y;return {x,y,direction:Math.abs(dx)+Math.abs(dy)>.01?facing(dx,dy):old.direction,moving:Math.abs(dx)+Math.abs(dy)>.01};}const tx=(target.left+target.width*.5-box.left)/box.width*100,ty=(target.top+target.height*.8-box.top)/box.height*100+(index%2)*6,dx=tx-old.x,dy=ty-old.y,stop=Math.max(10,(target.width*.5+26+index*10)/box.width*100),moving=Math.abs(dx)>stop||Math.abs(dy)>7;return {x:Math.max(6,Math.min(90,old.x+(Math.abs(dx)>stop?Math.sign(dx)*Math.min(.8,Math.abs(dx)-stop):0))),y:Math.max(38,Math.min(86,old.y+(Math.abs(dy)>7?Math.sign(dy)*.65:0))),direction:facing(dx,dy),moving};});},125);return()=>clearInterval(timer);},[arena,p.hp,running,view.target,p.targetUid,p.x,p.y,p.uid]);
 return <div className={`scene-pet ${p.hp<=0?'pet-downed':''}`} data-pet-uid={p.uid} style={{left:`${position.x}%`,top:`${position.y}%`}}><SequenceSprite name={p.form} identity={p.uid} cues={cues} dead={p.hp<=0} direction={position.direction} walking={position.moving} fallback={(assets.icons.monsters as Record<string,string>)[p.form]}/><small>{p.name||p.form}</small><progress value={p.hp} max={p.maxHp} aria-label={`${p.form}生命`}/></div>;
}
export function PetParty({c,view,busy,act,arena}:{c:Character;view:BattleView;busy:boolean;act:(a:any)=>Promise<any>;arena:RefObject<HTMLDivElement|null>}){const pets=view.petEntities||petSnapshot(c,Date.now());if(!pets.length)return null;return <><div className="pet-scene-layer" aria-label="戰場寵物">{pets.map((p,index)=><ScenePet key={p.uid} p={p} index={index} view={view} running={c.running} arena={arena}/>)}</div><details className="pet-battle-info"><summary>寵物 · {pets.filter(p=>p.hp>0).length}/{pets.length}{companionHasteUntil(c,'pet')>Date.now()?' · 綠水':''}</summary><div><CompanionHasteControl c={c} kind="pet" busy={busy} act={act}/>{pets.map(p=><article key={p.uid}><b>{p.name||p.form} · 等級 {p.lv}</b><small>生命 {Math.ceil(p.hp)}/{p.maxHp} · 魔力 {Math.ceil(p.mp)}/{p.maxMp}</small>{p.hp<=0&&<><Button disabled={busy} variant="outline" onClick={()=>act({type:'petRevive',pet:p.id||p.uid,method:'scroll'})}>卷軸復活</Button>{c.skills.includes('sk_resurrection')&&<Button disabled={busy} variant="outline" onClick={()=>act({type:'petRevive',pet:p.id||p.uid,method:'spell'})}>返生術</Button>}</>}</article>)}</div></details></>;}

export function PetSprite({form,dead=false}:{form:string;dead?:boolean}){return <SequenceSprite name={form} identity={`preview-${form}`} cues={[]} direction={6} dead={dead} fallback={(assets.icons.monsters as Record<string,string>)[form]}/>;}
