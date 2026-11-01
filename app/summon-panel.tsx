'use client';
import CompanionHasteControl from './companion-haste-control';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {SUMMON_TIERS,summonRing,summonEligible,summonCount,summonNumbers,summonForm} from '@/lib/game/summon-system';
import type {Character} from '@/lib/game/engine';
import {SequenceSprite} from './sequence-sprite';
import {facing,type MotionCue} from '@/lib/game/animation-clock';
import type {BattleView} from './use-combat-replay';
import animation from '@/lib/game/summon-animation.json';
import assets from '@/lib/game/asset-map.json';
import {MONSTER_ANCHOR} from './monster-anchor';
function SummonSprite({form,uid,view,dead,direction=2}:{form:string;uid:string;view:BattleView;dead:boolean;direction?:number}){const actions=view.actions||[],cues=useMemo(()=>actions.flatMap<MotionCue>(e=>{if(e.summonUid!==uid)return [];if(e.source==='monster')return e.damage&&!e.miss?[{seq:e.seq,at:e.at,kind:'hurt'}]:[];return e.kind==='attack'?[{seq:e.seq,at:e.at,kind:e.skill?'skill':'attack',key:`${e.at}:${e.skill||'attack'}`}]:[];}),[actions,uid]);return <SequenceSprite name={form} identity={uid} cues={cues} dead={dead} direction={direction} fallback={icons[form]}/>;}
const icons=assets.icons.monsters as Record<string,string>;
export function SummonSelect({c,st,busy,act}:{c:Character;st:Record<string,number>;busy:boolean;act:(a:any)=>Promise<any>}){const [open,setOpen]=useState(false);return <><p>目前召喚：{summonForm(c,st.cha)||'等級不足'} · {summonRing(c)?'召喚控制已啟用':'穿戴召喚控制戒指可選怪'}</p><Button variant="outline" disabled={busy||!summonRing(c)} onClick={()=>setOpen(true)}>選擇召喚怪物</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="game-dialog summon-select"><DialogTitle>召喚術：選擇召喚物</DialogTitle><DialogDescription>依人物等級與魅力解鎖。選擇後，下一次施放或自動重召使用此怪物。</DialogDescription><Button variant="outline" disabled={busy} onClick={async()=>{await act({type:'summonChoice',form:''});setOpen(false);}}>改回預設</Button><div className="summon-options">{SUMMON_TIERS.map((t,index)=><section key={index}><h3>Lv.{t.reqLv}{'reqCha' in t?` · 魅力 ${t.reqCha}`:''}</h3>{t.mobs.map(m=>{const ok=summonEligible(c,m.n,st.cha),d=summonNumbers(c,m.n,st);return <button key={m.n} disabled={busy||!ok} className={c.summonChoice===m.n?'selected':''} onClick={async()=>{await act({type:'summonChoice',form:m.n});setOpen(false);}}>{icons[m.n]&&<img src={icons[m.n]} alt=""/>}<span><b>{m.n}</b><small>Lv.{m.lv} · HP {m.hp}</small></span><span>{ok?`×${summonCount(c,m.n,st.cha)} · 1D${d.dice}+${d.flat}`:'等級或魅力不足'}<small>{(m.aspd/10).toFixed(1)} 秒／次</small></span></button>;})}</section>)}</div></DialogContent></Dialog></>;}
function SceneSummon({form,uid,view,dead}:{form:string;uid:string;view:BattleView;dead:boolean}){
 const ref=useRef<HTMLDivElement>(null),[direction,setDirection]=useState(2);
 useEffect(()=>{const update=()=>{if(dead)return;const actor=ref.current,arena=actor?.closest('.static-arena'),target=arena?.querySelector(`[data-monster-slot="${view.target||0}"] ${MONSTER_ANCHOR}`),box=actor?.getBoundingClientRect(),goal=target?.getBoundingClientRect();if(!box||!goal||!goal.width)return;setDirection(facing(goal.left+goal.width/2-box.left-box.width/2,goal.top+goal.height/2-box.top-box.height/2));};update();const timer=setInterval(update,200);return()=>clearInterval(timer);},[view.target,dead]);
 return <div ref={ref} className={`scene-summon ${dead?'summon-dead':''}`} data-summon-uid={uid}><SummonSprite form={form} uid={uid} view={view} dead={dead} direction={direction}/><small>{form}</small></div>;
}
export function SummonScene({c,view}:{c:Character;view:BattleView}){
 const entities=view.summonEntities||c.summonContract?.entities||[];
 if(!entities.length)return null;
 return <div className="summon-scene-layer" aria-label="戰場召喚物" style={{gridTemplateColumns:`repeat(${Math.min(3,entities.length)},minmax(0,1fr))`}}>{entities.map(s=><SceneSummon key={s.uid} form={s.form} uid={s.uid} view={view} dead={s.hp<=0}/>)}</div>;
}
export function SummonParty({c,view,busy,act}:{c:Character;view:BattleView;busy:boolean;act:(a:any)=>Promise<any>}){
 const entities=view.summonEntities||c.summonContract?.entities||[];
 if(!c.summonContract&&!entities.length)return null;
 return <details className="summon-management"><summary>召喚物 · {entities.filter(s=>s.hp>0).length} 隻存活<span>血量與管理</span></summary><div className="summon-management-content"><CompanionHasteControl c={c} kind="summon" busy={busy} act={act}/><div className="summon-party-heading"><Button variant="outline" disabled={busy||view.mp<50} onClick={()=>act({type:'cast',skill:'sk_summon'})}>重新施放 · MP50</Button><Button variant="outline" disabled={busy} onClick={()=>act({type:'summonDismiss'})}>解散</Button></div><div className="summon-companions">{entities.map(s=><article key={s.uid} className={s.hp<=0?'summon-dead':''}>{icons[s.form]&&<img className="summon-portrait" src={icons[s.form]} alt=""/>}<b>{s.form}</b><small>Lv.{s.lv}</small><progress value={s.hp} max={s.maxHp} aria-label={`${s.form}生命`}/><small>{s.hp>0?`${s.hp} / ${s.maxHp}`:'死亡消散'}</small></article>)}</div><p>全滅或到期後自動重召；MP不足時等待恢復。</p></div></details>;
}
