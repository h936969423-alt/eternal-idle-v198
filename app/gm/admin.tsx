'use client';
import {GmItemAppearanceProvider} from '../item-appearance-context';
import {GmPanels,GmPanel} from './collapsible';
import { useCallback, useEffect, useState } from 'react';
import { Shield, Skull, Timer, Map, Search, RefreshCw, Save, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {useDisplayMode,DisplayModePicker} from '../use-display-mode';
import MapPoolAdmin from './map-pool-admin';
import MonsterAdmin from './monster-admin';
import DollAdmin from './doll-admin';
import CharacterAdmin from './character-admin';
import MapAccessAdmin from './map-access-admin';
import ItemAppearanceAdmin from './item-appearance-admin';
import ItemTextAdmin from './item-text-admin';
import NpcAdmin from './npc-admin';
import type { WorldConfig } from '@/lib/game/world-rules';
type MapRow={id:string;name:string;baseCount:number;count:number;respawnMs:number;mobs:{id:string;name:string;count:number}[]};
function Multiplier({value,onChange,label,disabled}:{value:number;onChange:(n:number)=>void;label:string;disabled:boolean}){return <Select value={String(value)} onValueChange={v=>onChange(Number(v))} disabled={disabled}><SelectTrigger className="picker" aria-label={label}><SelectValue/></SelectTrigger><SelectContent>{Array.from({length:10},(_,i)=>i+1).map(n=><SelectItem value={String(n)} key={n}>{n} 倍</SelectItem>)}</SelectContent></Select>;}
export default function Admin(){
 const display=useDisplayMode();
 const [config,setConfig]=useState<WorldConfig|null>(null),[maps,setMaps]=useState<MapRow[]>([]),[count,setCount]=useState(2),[respawn,setRespawn]=useState(2),[query,setQuery]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
 const load=useCallback(async()=>{setLoading(true);try{const response=await fetch('/api/gm',{cache:'no-store'});const result:any=await response.json();if(!response.ok)throw new Error(result.error);setConfig(result.config);setMaps(result.maps);setCount(result.config.countMultiplier);setRespawn(result.config.respawnMultiplier);setError('');}catch(e){setError(e instanceof Error?e.message:'無法讀取設定');}finally{setLoading(false);}},[]);
 useEffect(()=>{void load();},[load]);
 async function save(){if(!config)return;setBusy(true);setSaved(false);setError('');try{const response=await fetch('/api/gm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:config.revision,countMultiplier:count,respawnMultiplier:respawn})});const result:any=await response.json();if(!response.ok)throw new Error(result.error);setConfig(result.config);setMaps(result.maps);setSaved(true);}catch(e){setError(e instanceof Error?e.message:'設定未儲存');}finally{setBusy(false);}}
 async function refreshSummary(){try{const response=await fetch('/api/gm',{cache:'no-store'}),result:any=await response.json();if(response.ok){setConfig(result.config);setMaps(result.maps);}}catch{}}
 const total=maps.reduce((n,m)=>n+m.baseCount,0);const changed=!!config&&(count!==config.countMultiplier||respawn!==config.respawnMultiplier);
 return <GmItemAppearanceProvider><div className={`gm-root ${display.landscape?'display-landscape':'display-portrait'}`}><header className="topbar"><div className="brand"><span className="brand-mark"><Shield size={23}/></span><div><strong>永夜放置</strong><span>GM 管理後台</span></div></div><DisplayModePicker mode={display.mode} onChange={display.setMode}/><a className="gm-back" href="/">返回遊戲</a></header><main className="gm-main"><div className="gm-heading"><div><span className="eyebrow">GAME MASTER</span><h1>GM 管理</h1><p>管理角色、裝備、金幣與狩獵地圖設定。</p></div><span className="gm-role"><Shield size={16}/>管理者權限</span></div>{error&&<div className="error-banner" role="alert">{error}<Button variant="outline" onClick={()=>load()} disabled={loading}><RefreshCw size={15}/>重新載入</Button></div>}{loading?<div className="loading-panel"><RefreshCw size={25} className="spin"/>讀取世界設定…</div>:config?<><div className="gm-overview"><div><Map size={21}/><span>狩獵地圖</span><strong>{maps.length}</strong></div><div><Skull size={21}/><span>目前怪物總量</span><strong>{maps.reduce((sum,m)=>sum+m.count,0)}<small>依地圖生成設定</small></strong></div><div><Timer size={21}/><span>目前重生等待</span><strong>0.6<small>秒／隻</small></strong></div></div><GmPanels><NpcAdmin/><MapAccessAdmin/><ItemTextAdmin/><ItemAppearanceAdmin/><CharacterAdmin/><DollAdmin/><MonsterAdmin/><GmPanel title="目前戰鬥設定" className="gm-settings"><p>全部狩獵地圖已生效</p><p className="gm-note">預設同場 3 隻、擊殺後 0.6 秒補位。各地圖可在下方調整怪物清單、數量、重生時間與生成開關。</p></GmPanel><MapPoolAdmin onSaved={()=>void refreshSummary()}/><GmPanel title="先前倍率設定紀錄" className="gm-history">{config.history.slice(-10).reverse().map((h,i)=><div key={`${h.at}-${i}`}><time>{new Date(h.at).toLocaleString('zh-TW',{hour12:false})}</time><span>怪物數量 ×{h.countMultiplier} · 重生時間 ×{h.respawnMultiplier}</span><small>{h.by==='initial'?'初始設定':'GM 更新'}</small></div>)}</GmPanel></GmPanels><p className="gm-note">村莊安全區不產生怪物。世界王多人戰鬥尚未實作，此設定套用於目前可玩的全部狩獵地圖。</p></>:null}</main></div></GmItemAppearanceProvider>;
}
