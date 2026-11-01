'use client';
import {useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';
import type {Character} from '@/lib/game/engine';
import {COMPANION_HASTE_ITEM,COMPANION_HASTE_PRICE,companionHasteUntil,type CompanionKind} from '@/lib/game/companion-haste';
/** Give pets or summons a green potion (+33% attack speed), from the bag or for gold. */
export default function CompanionHasteControl({c,kind,busy,act}:{c:Character;kind:CompanionKind;busy:boolean;act:(a:any)=>Promise<any>}){
 const [now,setNow]=useState(()=>Date.now());useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t);},[]);
 const left=Math.max(0,Math.ceil((companionHasteUntil(c,kind)-now)/1000)),stock=c.locked?.includes(COMPANION_HASTE_ITEM)?0:c.bag[COMPANION_HASTE_ITEM]||0,auto=!!c.companionHasteAuto?.[kind];
 return <div className="companion-haste" onClick={e=>e.stopPropagation()}>
  <span className={left?'companion-haste-on':'companion-haste-off'}>綠水 {left?`攻速 +33% · 剩 ${left} 秒`:'未生效'}</span>
  <Button type="button" variant="outline" disabled={busy||!stock&&c.gold<COMPANION_HASTE_PRICE} onClick={()=>act({type:'companionHaste',kind})}>{stock?`餵綠水（背包 ${stock}）`:`餵綠水（${COMPANION_HASTE_PRICE} 金幣）`}</Button>
  <label><input type="checkbox" checked={auto} disabled={busy} onChange={e=>act({type:'companionHasteAuto',kind,value:e.target.checked})}/>狩獵時自動補</label>
 </div>;
}
