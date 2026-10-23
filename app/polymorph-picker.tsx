'use client';
import {useState} from 'react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {selectableForms,hasPolyControl,unlockedForm,polymorphUnlockError,type PolyForm} from '@/lib/game/polymorph';
import PolymorphUnlockDialog from './polymorph-unlock-dialog';
import type {Character} from '@/lib/game/engine';
export default function PolymorphPicker({c,scroll,busy,act,close}:{c:Character;scroll:string;busy:boolean;act:(a:any)=>Promise<any>;close:()=>void}){
 const [query,setQuery]=useState(''),[unlock,setUnlock]=useState<PolyForm|null>(null);
 const forms=selectableForms(c).filter(f=>!query||f.name.includes(query));
 const usableScroll=(c.bag[scroll]||0)>0&&!c.locked?.includes(scroll),control=hasPolyControl(c);
 return <><Dialog open onOpenChange={v=>{if(!v&&!busy)close();}}><DialogContent className="game-dialog polymorph-picker"><DialogTitle>自選變身</DialogTitle><DialogDescription>可選目前與上一等級段。選擇後消耗 1 張變形卷軸，關閉不消耗；Lv55 開啟後同帳號共用。</DialogDescription><input className="auto-sale-search" aria-label="搜尋自選變身" placeholder="搜尋變身名稱…" value={query} onChange={e=>setQuery(e.target.value)}/>{!control&&<p role="alert">需要持有變形控制戒指。</p>}{!usableScroll&&<p role="alert">變形卷軸已用完或已鎖定。</p>}{forms.some(f=>f.crystals>0)&&<p>每種 Lv55 變身開啟需金幣 6000 萬、BOSS 結晶與賦予武器／盔甲／飾品祝福卷軸各 5 個。</p>}<div className="polymorph-picker-grid">{forms.map(f=>{const ready=unlockedForm(c,f),locked=!!f.crystals&&!c.polyUnlocked?.includes(f.id);return <button key={f.id} disabled={busy||(!locked&&(!control||!ready||!usableScroll))} title={locked?polymorphUnlockError(c,f.id)||undefined:undefined} onClick={async()=>{if(locked){setUnlock(f);return;}if(await act({type:'polyUse',id:f.id,item:scroll}))close();}}><img src={f.frames.idle[0]} alt=""/><strong>{f.name}</strong><span>Lv.{f.level}</span><small>{f.bonusText}</small><small>{locked?'查看條件／開啟':c.lv<f.level?'等級不足':'選擇變身'}</small></button>;})}</div>{!forms.length&&<p>沒有符合的變身。</p>}<Button variant="outline" disabled={busy} onClick={close}>取消</Button></DialogContent></Dialog><PolymorphUnlockDialog c={c} form={unlock} busy={busy} act={act} close={()=>setUnlock(null)}/></>;
}
