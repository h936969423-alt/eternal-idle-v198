'use client';
import {useEffect,useMemo,useState} from 'react';
import {GmPanel} from './collapsible';
import {Button} from '@/components/ui/button';
import raw from '@/lib/game/gamedata.json';
import {importedEffects,initialCombatEffects,type CombatEffectsConfig} from '@/lib/game/imported-effects';
import {EffectAtlas} from '../imported-combat-effects';
const catalog=raw.items as Record<string,any>;
export default function CombatEffectsAdmin(){
 const [config,setConfig]=useState<CombatEffectsConfig|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[query,setQuery]=useState(''),[weaponQuery,setWeaponQuery]=useState(''),[item,setItem]=useState(''),[preview,setPreview]=useState(''),[age,setAge]=useState(0),[library,setLibrary]=useState('weapon');
 async function load(){setBusy(true);try{const r=await fetch('/api/combat-effects',{cache:'no-store'}),x:any=await r.json();if(!r.ok)throw Error(x.error);setConfig(x);setMessage('');}catch(e){setMessage(e instanceof Error?e.message:'讀取失敗');}finally{setBusy(false);}}
 useEffect(()=>{void load();},[]);
 useEffect(()=>{if(!preview)return;let raf=0;const start=performance.now();const tick=(now:number)=>{setAge(now-start);const clip=importedEffects.clips[importedEffects.entries[preview].clip];if(now-start<clip.count/clip.fps*1000)raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);},[preview]);
 const entries=useMemo(()=>Object.values(importedEffects.entries).filter(e=>e.category===library&&(!query||`${e.code} ${e.label}`.toLowerCase().includes(query.toLowerCase()))),[query,library]);
 const weapons=useMemo(()=>Object.entries(catalog).filter(([id,x])=>x.type==='wpn'&&(!weaponQuery||`${id} ${x.n}`.includes(weaponQuery))).slice(0,100),[weaponQuery]);
 async function save(){if(!config)return;setBusy(true);try{const r=await fetch('/api/combat-effects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(config)}),x:any=await r.json();if(!r.ok)throw Error(x.error);setConfig(x);window.dispatchEvent(new CustomEvent('combat-effects-updated',{detail:x}));setMessage('已儲存，其他遊戲視窗最遲15秒內套用。');}catch(e){setMessage(e instanceof Error?e.message:'儲存失敗');}finally{setBusy(false);}}
 const choice=(label:string,value:string,change:(s:string)=>void)=><label style={{display:'grid',gap:6}}>{label}<select value={value} disabled={busy} onChange={e=>change(e.target.value)}><option value="off">關閉</option>{Object.values(importedEffects.entries).filter(e=>e.category==='weapon').map(e=><option key={e.id} value={e.id}>{e.code} · {e.label}</option>)}</select></label>;
 return <GmPanel title="攻擊魔法與武器特效編號"><p>已匯入五職業魔法、單套三重矢及全部武器替換特效。特效只改變顯示，不更動傷害、命中率或攻擊範圍。</p>{message&&<p role="status">{message}</p>}<Button variant="outline" disabled={busy} onClick={()=>void load()}>重新載入</Button>{config&&<>
 <label><input type="checkbox" checked={config.enabled} disabled={busy} onChange={e=>setConfig({...config,enabled:e.target.checked})}/>啟用武器與三重矢特效</label>
 <h3>武器類型預設</h3><div style={{display:'grid',gap:12}}>{Object.entries({bow:'弓箭',dark:'黑妖',dragon:'龍騎',other:'其他武器'}).map(([key,label])=><div key={key}>{choice(label,config.defaults[key],value=>setConfig({...config,defaults:{...config.defaults,[key]:value}}))}</div>)}</div>
 <h3>指定武器特效編號</h3><label>搜尋武器名稱或編號<input value={weaponQuery} onChange={e=>setWeaponQuery(e.target.value)}/></label><label>選擇武器<select value={item} onChange={e=>setItem(e.target.value)}><option value="">請選擇武器（搜尋最多顯示100件）</option>{weapons.map(([id,x])=><option key={id} value={id}>{x.n} · {id}</option>)}</select></label>
 {item&&<><p>{catalog[item]?.n} · {item}</p>{choice('命中特效編號／版本',config.weapons[item]||config.defaults[catalog[item]?.isBow?'bow':'other'],id=>setConfig({...config,weapons:{...config.weapons,[item]:id}}))}<Button variant="outline" onClick={()=>{const next={...config.weapons};delete next[item];setConfig({...config,weapons:next});}}>沿用類型預設</Button><p>{config.weapons[item]?'此武器已設定專屬特效':'此武器沿用類型預設'}</p></>}
 <Button disabled={busy} onClick={()=>void save()}>儲存武器特效設定</Button>
 </>}
 <h3>完整圖檔編號與預覽</h3><label>素材分類<select value={library} onChange={e=>{setLibrary(e.target.value);setPreview('');}}><option value="weapon">魔法武器特效</option><option value="spell">五職業魔法特效</option><option value="triple">三重矢（已選用 sprite_0923）</option></select></label><label>搜尋特效編號或名稱<input placeholder="例如 23865、衝擊之暈" value={query} onChange={e=>setQuery(e.target.value)}/></label><p>符合 {entries.length} 個編號／版本；相同編號可有不同圖樣。</p><label>預覽特效<select value={preview} onChange={e=>{setPreview(e.target.value);setAge(0);}}><option value="">選擇特效</option>{entries.map(e=><option key={e.id} value={e.id}>{e.code} · {e.label}</option>)}</select></label>
 {preview&&<div style={{background:'#121820',padding:20,minHeight:220,color:'white'}}><p>{importedEffects.entries[preview].code} · {importedEffects.entries[preview].label}</p><EffectAtlas clip={importedEffects.clips[importedEffects.entries[preview].clip]} age={age} width={240}/><Button variant="outline" onClick={()=>{const id=preview;setPreview('');requestAnimationFrame(()=>setPreview(id));}}>重播</Button>{library==='weapon'&&item&&config&&<Button onClick={()=>setConfig({...config,weapons:{...config.weapons,[item]:preview}})}>套用到 {catalog[item]?.n}（儲存後生效）</Button>}</div>}
 </GmPanel>;
}
