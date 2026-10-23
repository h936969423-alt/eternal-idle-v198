'use client';
import {useEffect,useState,type CSSProperties} from 'react';
import {DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import ItemIcon from './item-icon';
import GearName from './gear-name';
import type {Character} from '@/lib/game/engine';
import {GILEN_ID,GILEN_ZONE,gilenBookIds} from '@/lib/game/npc-magic';
import {merchantInventory} from '@/lib/game/npc-config';
import {requiredSkillLevel,elementError} from '@/lib/game/spell-rules';
import {specialSkillSupported} from '@/lib/game/combat-rules';
import {skillSummary} from '@/lib/game/magic';
import raw from '@/lib/game/gamedata.json';
import assets from '@/lib/game/asset-map.json';
const skills=raw.skills as Record<string,any>,items=raw.items as Record<string,any>,icons=assets.icons.items as Record<string,string>;
export function gilenDialogBounds(width:number,height:number,offsetTop=0){
 const compact=height<=500,topGap=compact?32:width<=640?136:32,bottomGap=compact?40:width<=640?72:24;
 return {top:offsetTop+topGap,height:Math.max(96,Math.min(860,height-topGap-bottomGap))};
}
export function useGilenDialogViewport(active:boolean){
 const [bounds,setBounds]=useState<ReturnType<typeof gilenDialogBounds>|null>(null);
 useEffect(()=>{if(!active)return;const viewport=window.visualViewport;
 const update=()=>setBounds(gilenDialogBounds(viewport?.width||window.innerWidth,viewport?.height||window.innerHeight,viewport?.offsetTop||0));
 update();window.addEventListener('resize',update);viewport?.addEventListener('resize',update);viewport?.addEventListener('scroll',update);
 return()=>{window.removeEventListener('resize',update);viewport?.removeEventListener('resize',update);viewport?.removeEventListener('scroll',update);};
 },[active]);
 return bounds?{'--gilen-top':`${bounds.top}px`,'--gilen-height':`${bounds.height}px`} as CSSProperties:undefined;
}
export default function GilenSpellShop({c,name='吉倫',zone=GILEN_ZONE,npcId=GILEN_ID,busy,act,onClose}:{c:Character;name?:string;zone?:string;npcId?:string;busy:boolean;act:(a:any)=>Promise<any>;onClose:()=>void}){
 const [expanded,setExpanded]=useState<string|null>(null),[pending,setPending]=useState<string|null>(null);
 const prices=merchantInventory(zone,npcId,c.npcConfig),ids=gilenBookIds().filter(id=>Object.hasOwn(prices,id));
 return <><header className="gilen-header"><DialogTitle>{name}（魔法傳授者）</DialogTitle><strong aria-label="持有金幣"><span>持有金幣</span> 💰 {c.gold.toLocaleString('zh-TW')}</strong></header><DialogDescription className="sr-only">1～3 級一般魔法；符合職業與等級即可扣除列表金幣直接學習。</DialogDescription><div className="gilen-spell-list" aria-label="1至3級魔法清單">{ids.map(id=>{
 const item=items[id],skill=skills[item.sk],level=requiredSkillLevel(c,skill),known=c.skills.includes(item.sk),supported=specialSkillSupported(item.sk,skill.type),element=elementError(c,skill),why=!Number.isFinite(level)?'職業不符':c.lv<level?'等級不足':!supported?'尚未實裝':element||c.gold<prices[id]&&'金幣不足'||'',disabled=busy||!!pending||c.zone!==zone||known||!!why;
 return <article className="gilen-spell-row" key={id}><ItemIcon src={item.sourceIcon||icons[item.n]} alt={item.n} size={46}/><div className="gilen-spell-copy"><div className="gilen-spell-name"><GearName c={c} item={id}/><button className="gilen-details-toggle" aria-expanded={expanded===id} aria-controls={`gilen-details-${id}`} onClick={()=>setExpanded(expanded===id?null:id)}>{expanded===id?'▾':'▸'}詳情</button></div><p>💰 {prices[id].toLocaleString('zh-TW')}　{Number.isFinite(level)?`需 Lv.${level}`:'職業不符'}</p></div><Button className={`gilen-learn ${known?'is-known':''}`} disabled={disabled} title={known?'已學會':why||'直接扣款學習'} onClick={async()=>{setPending(id);try{await act({type:'learn',npc:npcId,skill:item.sk});}finally{setPending(null);}}}>{known?'已學會':pending===id?'學習中…':why||'學習'}</Button>{expanded===id&&<div id={`gilen-details-${id}`} className="gilen-spell-details"><strong>{skill.n} · {skill.tier} 級魔法</strong><p>{skillSummary(item.sk)}</p><p>施放消耗 MP {skill.mp||0}{skill.dur?` · 持續 ${skill.dur} 秒`:''}</p></div>}</article>;
 })}{!ids.length&&<p>目前沒有可傳授的魔法。</p>}</div><footer className="gilen-footer"><Button className="gilen-close" onClick={onClose}>關閉</Button></footer></>;
}
