'use client';
/** Landscape map HUD (layout B): status top-left, gold top-centre, shortcuts top-right, place and chat bottom-left, quick bar bottom-centre, action pad bottom-right. */
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {Backpack,Map as MapIcon,ScrollText,Sparkles,WandSparkles} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import raw from '@/lib/game/gamedata.json';
import type {Character} from '@/lib/game/engine';
import type {BattleView} from './use-combat-replay';
import {skillReadyAt} from '@/lib/game/skill-cooldown';
import {hotbarItemAction,nextTargetSlot,placeInHotbar,resolveHotbar,selfHealSkill,type HotbarSlot} from '@/lib/game/hotbar';
import LandscapeMinimap from './landscape-minimap';
import {useNameOnHead} from './name-on-head';
import './landscape-hud.css';
const items=raw.items as Record<string,{n:string;type?:string;eff?:string}>,skills=raw.skills as Record<string,{n:string;type?:string;mp?:number}>;
type Icon=(name:string,group:'items'|'skills',size:number,itemId?:string)=>ReactNode;
type Act=(a:Record<string,unknown>)=>Promise<unknown>;
const nf=(n:number)=>Math.floor(n).toLocaleString('en-US');
const QUICK_POTIONS=['potion_heal','potion_strong'];

function Vital({kind,value,max}:{kind:'hp'|'mp';value:number;max:number}){
 const pct=Math.max(0,Math.min(100,value/Math.max(1,max)*100));
 return <div className={`lhud-vital ${kind}`} role="progressbar" aria-label={kind==='hp'?'生命值':'魔力值'} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}><span style={{width:`${pct}%`}}/><strong>{kind.toUpperCase()} {Math.max(0,Math.round(value))} / {max}</strong></div>;
}

function Hotbar({c,castable,busy,act,icon,serverOffset}:{c:Character;castable:string[];busy:boolean;act:Act;icon:Icon;serverOffset:number}){
 const slots=resolveHotbar(c.hotbar,castable),[editing,setEditing]=useState<number|null>(null),[clock,setClock]=useState(Date.now()),press=useRef<{timer:ReturnType<typeof setTimeout>|null;long:boolean}>({timer:null,long:false});
 useEffect(()=>{const t=setInterval(()=>setClock(Date.now()),250);return()=>clearInterval(t);},[]);
 const choose=(slot:HotbarSlot)=>{if(editing===null)return;const next=placeInHotbar(slots,editing,slot);setEditing(null);void act({type:'hotbar',slots:next});};
 const use=(slot:HotbarSlot,index:number)=>{if(!slot){setEditing(index);return;}if(slot.k==='s'){if(castable.includes(slot.id))void act({type:'cast',skill:slot.id});return;}const kind=hotbarItemAction(items[slot.id]);if(kind&&(c.bag[slot.id]||0)>0&&!c.locked?.includes(slot.id))void act({type:kind,item:slot.id});};
 const down=(index:number)=>{press.current.long=false;if(press.current.timer)clearTimeout(press.current.timer);press.current.timer=setTimeout(()=>{press.current.long=true;setEditing(index);},500);};
 const up=()=>{if(press.current.timer)clearTimeout(press.current.timer);press.current.timer=null;};
 const usableItems=Object.keys(items).filter(id=>hotbarItemAction(items[id])&&((c.bag[id]||0)>0||['potion_heal','potion_strong','potion_ult','scroll_poly'].includes(id)));
 return <><div className="lhud-hotbar" aria-label="快捷欄（長按可更換）">{slots.map((slot,index)=>{
  const skill=slot?.k==='s'?skills[slot.id]:undefined,item=slot?.k==='i'?items[slot.id]:undefined,name=skill?.n||item?.n||'',count=slot?.k==='i'?c.bag[slot.id]||0:0;
  const cooling=slot?.k==='s'?Math.max(0,skillReadyAt(c,slot.id)-(clock+serverOffset)):0,unusable=!!slot&&(slot.k==='s'?!castable.includes(slot.id):count<=0);
  return <button key={index} type="button" className={`lhud-slot ${slot?'':'empty'} ${unusable?'unusable':''}`} aria-label={slot?`${name}${slot.k==='i'?`，剩餘 ${count}`:''}（長按更換）`:`空格 ${index+1}，點一下放入技能或物品`} title={name||'空格'} disabled={busy&&!!slot}
   onPointerDown={()=>down(index)} onPointerUp={up} onPointerLeave={up} onPointerCancel={up} onContextMenu={e=>e.preventDefault()}
   onClick={()=>{if(press.current.long){press.current.long=false;return;}use(slot,index);}}>
   {slot&&icon(name,slot.k==='s'?'skills':'items',22,slot.k==='i'?slot.id:undefined)}
   {slot?.k==='i'&&<small>{nf(count)}</small>}
   {cooling>0&&<em aria-hidden="true">{Math.ceil(cooling/1000)}</em>}
  </button>;})}</div>
  <Dialog open={editing!==null} onOpenChange={open=>{if(!open)setEditing(null);}}><DialogContent className="game-dialog lhud-picker"><DialogTitle>快捷欄第 {(editing??0)+1} 格</DialogTitle><DialogDescription>選一個技能或物品放進這格；同一個技能或物品只會留在一格。</DialogDescription>
   <h3>技能</h3>{castable.length?<div className="lhud-picker-grid">{castable.map(id=><button key={id} type="button" onClick={()=>choose({k:'s',id})}>{icon(skills[id]?.n||id,'skills',28)}<span>{skills[id]?.n||id}</span></button>)}</div>:<p>還沒有可施放的技能。</p>}
   <h3>物品</h3><div className="lhud-picker-grid">{usableItems.map(id=><button key={id} type="button" onClick={()=>choose({k:'i',id})}>{icon(items[id].n,'items',28,id)}<span>{items[id].n}<small> × {nf(c.bag[id]||0)}</small></span></button>)}</div>
   {editing!==null&&slots[editing]&&<button type="button" className="lhud-picker-clear" onClick={()=>choose(null)}>清空這格</button>}
  </DialogContent></Dialog></>;
}

function ActionPad({c,view,castable,busy,act}:{c:Character;view:BattleView;castable:string[];busy:boolean;act:Act}){
 const hp=view.arena.map(m=>m.hp),current=view.target||0,alive=hp.some(h=>h>0),heal=selfHealSkill(castable,skills);
 const attack=async()=>{if(!(hp[current]>0)){const next=nextTargetSlot(hp,current);if(next!==undefined)await act({type:'target',slot:next});}if(!c.running)await act({type:'run',value:true});};
 const retarget=()=>{const next=nextTargetSlot(hp,current);if(next!==undefined)void act({type:'target',slot:next});};
 return <div className="lhud-pad" aria-label="戰鬥操作">
  <button type="button" className="lhud-attack" disabled={busy||!alive} onClick={()=>void attack()} aria-label="攻擊目前目標">攻擊</button>
  <button type="button" className={`lhud-auto ${c.running?'on':''}`} aria-pressed={c.running} disabled={busy||(!alive&&!c.running)} onClick={()=>void act({type:'run',value:!c.running})} aria-label={c.running?'停止自動狩獵':'開始自動狩獵'}>AUTO</button>
  <button type="button" className="lhud-self" disabled={busy||!heal} onClick={()=>heal&&void act({type:'cast',skill:heal})} aria-label={heal?`對自己施放${skills[heal]?.n}`:'還沒有可對自己施放的治癒魔法'}>SELF</button>
  <button type="button" className="lhud-next" disabled={busy||nextTargetSlot(hp,current)===undefined} onClick={retarget} aria-label="切換到下一隻怪">換目標</button>
 </div>;
}

export default function LandscapeHud({c,view,maxHp,maxMp,ac,mr,avatar,nameColor,zoneLabel,inTown,castable,busy,act,icon,serverOffset,openPanel,openCharacter,xpPct}:{xpPct:number;c:Character;view:BattleView;maxHp:number;maxMp:number;ac:number;mr:number;avatar:string;nameColor:string;zoneLabel:string;inTown:boolean;castable:string[];busy:boolean;act:Act;icon:Icon;serverOffset:number;openPanel:(tab:string)=>void;openCharacter:()=>void}){
 useNameOnHead(true);
 return <div className="lhud">
  <section className="lhud-status" aria-label="角色狀態">
   <button type="button" className="lhud-avatar" aria-label="角色配置" onClick={openCharacter}><img src={avatar} alt=""/><b>{c.lv}</b></button>
   <div className="lhud-identity"><p><strong style={{color:nameColor}}>{c.name}</strong><span>防禦 {ac} · 魔防 {mr}</span></p><Vital kind="hp" value={view.hp??c.hp} max={maxHp}/><Vital kind="mp" value={view.mp??c.mp} max={maxMp}/></div>
  </section>
  <div className="lhud-quick" aria-label="常用藥水">{QUICK_POTIONS.map(id=><button key={id} type="button" disabled={busy||!c.bag[id]||c.locked?.includes(id)} onClick={()=>void act({type:'potion',item:id})} aria-label={`${items[id].n}，剩餘 ${c.bag[id]||0}`}>{icon(items[id].n,'items',30,id)}<small>{nf(c.bag[id]||0)}</small></button>)}</div>
  <output className="lhud-gold" aria-label="金幣">● {nf(c.gold)}</output>
  <div className="lhud-shortcuts">
   <button type="button" onClick={()=>openPanel('bag')}><Backpack size={18} aria-hidden="true"/><span>背包</span></button>
   <button type="button" onClick={()=>openPanel('skills')}><WandSparkles size={18} aria-hidden="true"/><span>技能</span></button>
   <button type="button" onClick={()=>openPanel('poly')}><Sparkles size={18} aria-hidden="true"/><span>變身</span></button>
  </div>
  <div className="lhud-place"><p><MapIcon size={14} aria-hidden="true"/><span>{zoneLabel}</span></p><LandscapeMinimap/></div>
  <div className="lhud-talk"><button type="button" onClick={()=>openPanel('chat')}><ScrollText size={15} aria-hidden="true"/>聊天</button><strong className="lhud-exp-label">EXP {Math.min(100,Math.max(0,xpPct)).toFixed(2)}%</strong></div>
  <div className="lhud-exp" role="progressbar" aria-label="經驗進度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number(Math.min(100,Math.max(0,xpPct)).toFixed(2))}><span style={{width:`${Math.min(100,Math.max(0,xpPct))}%`}}/></div>
  <Hotbar c={c} castable={castable} busy={busy} act={act} icon={icon} serverOffset={serverOffset}/>
  {!inTown&&<ActionPad c={c} view={view} castable={castable} busy={busy} act={act}/>}
 </div>;
}
