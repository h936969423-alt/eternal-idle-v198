'use client';
import './sunrise-pet-panel.css';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {AlertDialog,AlertDialogContent,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel} from '@/components/ui/alert-dialog';
import type {Character} from '@/lib/game/engine';
import {PET_BOOK,petStats,petNamesOut,petNeedV2} from '@/lib/game/pet-system';
import {PET_ITEMS,petCharmUsed} from '@/lib/game/pet-roster';
import {lureAvailability} from '@/lib/game/pet-lure-availability';
import {PetSprite} from './pet-party';
import raw from '@/lib/game/gamedata.json';
import {baseItem} from '@/lib/game/gear';

export default function SunrisePetPanel({c,busy,act}:{c:Character;busy:boolean;act:(a:any)=>Promise<any>}){
 const [selected,setSelected]=useState(''),[query,setQuery]=useState(''),[rename,setRename]=useState(''),[release,setRelease]=useState('');
 const entries=Object.entries(c.pets||{}),key=entries.some(([id])=>id===selected)?selected:entries[0]?.[0]||'',p=c.pets?.[key],form=p?.form||key,def=PET_BOOK[form],d=p&&def?petStats(c,key,p):null,outs=petNamesOut(c),foreign=!!p?.owner&&p.owner!==c.id,items=raw.items as Record<string,any>,town=!!(raw.towns as Record<string,unknown>)[c.zone];
 return <section className="verified-progress sunrise-pet-panel">
  <h3>寵物保管 {entries.length}／32</h3><p>最多出戰4隻；每隻魅力需求加總。已用魅力 {petCharmUsed(c)} · 出戰 {outs.length}／4。</p>
  <input aria-label="搜尋寵物" placeholder="搜尋種類或暱稱…" value={query} onChange={e=>setQuery(e.target.value)}/>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:8,margin:'12px 0'}}>{entries.filter(([id,x])=>(x.name||'').includes(query)||(x.form||id).includes(query)).map(([id,x])=><Button key={id} variant={key===id?'default':'outline'} disabled={busy} style={{height:'auto',minWidth:0,whiteSpace:'normal',padding:10}} onClick={()=>{setSelected(id);setRename(x.name||'');}}>{x.name||x.form||id} · 等級{x.lv}{x.locked?' 🔒':''}{x.owner===c.id?' · 出戰':x.owner?' · 其他角色出戰':''}{x.hp===0?' · 倒地':''}</Button>)}</div>
  {!entries.length&&<p>尚無寵物。可購買誘捕藥劑，使用後擊殺指定動物；也可孵化寵物蛋。</p>}
  {p&&def&&d&&<div className="pet-progress-card"><div className="summon-art"><PetSprite form={form} dead={p.hp===0}/></div><h3>{p.name||form} · 等級 {p.lv}</h3><p>{form} · 魅力需求 {def.cha} · {p.owner===c.id?'出戰中':foreign?'其他角色出戰中':'保管中'}</p>
   <p>生命 {Math.ceil(p.hp||0)}／{p.maxHp} · 魔力 {Math.ceil(p.mp||0)}／{(p.maxMp||0)+d.mmpBonus}</p><p>命中 {d.hit} · 防禦 {d.ac} · 魔防 {d.mr} · 傷害減免 {d.dr}</p><p>經驗 {p.xp}／{petNeedV2(p.lv)} · 等級上限跟隨角色，達上限不囤經驗</p><p>技能：{def.sk.map((s:any)=>`${s.n}（魔力${s.mp}）`).join('、')||'一般攻擊'}</p>
   <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><Button disabled={busy||foreign} onClick={()=>act({type:'petSummon',pet:key})}>{p.owner===c.id?'收回保管':'出戰'}</Button><Button variant="outline" disabled={busy||foreign} onClick={()=>act({type:'petLock',pet:key})}>{p.locked?'解除鎖定':'鎖定寵物'}</Button><Button variant="outline" disabled={busy||foreign||p.locked||!!p.owner} onClick={()=>setRelease(key)}>放生</Button></div>
   <label>暱稱<input aria-label="寵物暱稱" maxLength={12} value={rename} onChange={e=>setRename(e.target.value)}/></label><Button variant="outline" disabled={busy||foreign} onClick={()=>act({type:'petRename',pet:key,name:rename})}>儲存暱稱</Button>
   <label>自動補血<select aria-label="寵物自動補血" disabled={busy||foreign} value={p.potPct||0} onChange={e=>act({type:'petPotion',pet:key,percent:Number(e.target.value)})}>{[0,25,50,70,90,95].map(n=><option key={n} value={n}>{n?n+'%以下喝隊長設定藥水':'關閉'}</option>)}</select></label>
   {p.hp===0&&<><p>野外倒地5秒後自動消耗未鎖定復活卷軸，回村免費補滿；卷軸／返生術復活為半血。</p><Button disabled={busy||foreign} onClick={()=>act({type:'petRevive',pet:key,method:'scroll'})}>卷軸復活</Button>{c.skills.includes('sk_resurrection')&&<Button disabled={busy||foreign} onClick={()=>act({type:'petRevive',pet:key,method:'spell'})}>返生術</Button>}</>}
   {(['weapon','armor'] as const).map(slot=><label key={slot}>{slot==='weapon'?'寵物武器':'寵物防具'}<select aria-label={slot==='weapon'?'寵物武器':'寵物防具'} disabled={busy||foreign} value={p.gear?.[slot]?.id||''} onChange={e=>act({type:'petGear',pet:key,slot,item:e.target.value})}><option value="">未裝備／卸下</option>{p.gear?.[slot]&&<option value={p.gear[slot].id}>{items[baseItem(p.gear[slot].id)]?.n} ＋{p.gear[slot].en}</option>}{Object.keys(c.bag).filter(id=>c.bag[id]>0&&!c.locked?.includes(id)&&items[baseItem(id)]?.slot===(slot==='weapon'?'petwpn':'petarm')).map(id=><option key={id} value={id}>{items[baseItem(id)].n} ＋{c.enh[id]||0}</option>)}</select></label>)}
   {def.tier===0&&def.evo&&<><p>30級可進化；進化後1級，生命／魔力上限為原本一半，並收回保管。</p>{['evolve','victory'].map(f=><Button key={f} variant="outline" disabled={busy||foreign||p.lv<30||!(c.bag['sunrise_pet_fruit_'+f]>0)} onClick={()=>act({type:'petEvolve',pet:key,fruit:'sunrise_pet_fruit_'+f})}>進化為{f==='victory'?'黃金龍':def.evo}</Button>)}</>}
  </div>}
  <details><summary>寵物用品商店／背包道具</summary><p>購買需在村莊。誘捕持續600秒，保管滿時不消耗誘捕狀態；孵蛋時先檢查保管容量。</p><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:8}}>{Object.entries(PET_ITEMS).map(([id,item])=>{const lure=item.petLure?lureAvailability(item.petLure,c):undefined,dead=!!lure&&!lure.available.length;return <article key={id} className={`pet-shop-item${dead?' pet-lure-unavailable':''}`} style={{border:'1px solid #665437',padding:10,borderRadius:8}}><strong>{item.n}</strong>{dead&&<span className="pet-lure-badge">目前無法捕捉</span>}<p>{item.p.toLocaleString()} 金幣 · 持有 {c.bag[id]||0}</p>
   {lure&&<div className="pet-lure-targets">{lure.available.map(t=><p key={t.mob} className="pet-lure-ok">✓ {t.mob}{t.form!==t.mob?`（${t.form}）`:''}：{t.zones.slice(0,3).join('、')}{t.zones.length>3?` 等 ${t.zones.length} 處`:''}</p>)}{lure.missing.length>0&&<p className="pet-lure-missing">✕ 目前沒有出沒：{lure.missing.join('、')}</p>}{item.petLure==='general'&&<p className="pet-lure-note">背包的「肉」也可使用，效果相同，持續 300 秒。</p>}</div>}
   <Button variant="outline" disabled={busy||!town||c.gold<item.p||dead} title={dead?'目前沒有可誘捕的動物出沒':undefined} onClick={()=>act({type:'petBuy',item:id})}>{dead?'暫停販售':'購買'}</Button>{(item.petEgg||item.petLure)&&<Button disabled={busy||!(c.bag[id]>0)||c.locked?.includes(id)||dead} title={dead?'目前沒有可誘捕的動物出沒，使用也抓不到':undefined} onClick={()=>act({type:'petUse',item:id})}>{item.petEgg?'孵化':'使用'}</Button>}</article>;})}</div></details>
  <p>存活出戰寵物各得完整擊殺經驗，升級需求為永夜人物表的十分之一。存檔由帳號共用保管保存；同種寵物各自成長。</p>
  <AlertDialog open={!!release} onOpenChange={v=>{if(!v)setRelease('');}}><AlertDialogContent><AlertDialogTitle>確認放生寵物</AlertDialogTitle><AlertDialogDescription>放生無法復原，已裝備的寵物裝備會退回目前角色背包。</AlertDialogDescription><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><Button disabled={busy} onClick={async()=>{if(await act({type:'petRelease',pet:release,confirm:true})){setRelease('');setSelected('');}}}>確認放生</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </section>;
}
