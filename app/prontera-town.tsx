'use client';
import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {PRONTERA as city,cityPath,cityWalkable,CITY_VENDOR,type CityPoint} from '@/lib/game/prontera-navigation';
import type {Character} from '@/lib/game/engine';
import {activeForm} from '@/lib/game/polymorph';
import amap from '@/lib/game/asset-map.json';
import PlayerSpriteFrame from './player-sprite-frame';
import './prontera-town.css';
type Stop={id:string;name:string;x:number;y:number;kind:'npc'|'portal'};
const stops:Stop[]=[...city.npcs.map(n=>({...n,kind:'npc' as const})),...city.portals.map(n=>({...n,kind:'portal' as const}))];
export default function PronteraTown({c,busy,onClose,onService,onVendor}:{c:Character;busy:boolean;onClose:()=>void;onService:(tab:string)=>void;onVendor:(id:string)=>Promise<unknown>}){
 const [pos,setPos]=useState<CityPoint>(city.spawn),[path,setPath]=useState<CityPoint[]>([]),[selected,setSelected]=useState<Stop|null>(null),[message,setMessage]=useState('點擊道路移動，或選擇服務自動前往。'),[frame,setFrame]=useState(0),[zoom,setZoom]=useState(1);
 const arrival=useRef<Stop|null>(null),viewport=useRef<HTMLDivElement>(null),actor=useRef<SVGGElement>(null);
 const poly=c.polyLook!==false?activeForm(c):undefined;
 const prefix=c.cls==='royal'?`royal_${c.gender==='f'?'f':'m'}`:c.cls==='knight'?(c.gender==='f'?'knight_f':'knight_2hsword'):c.cls==='elf'?`elf_${c.gender==='f'?'f':'m'}_melee`:c.cls==='mage'?`mage_${c.gender==='f'?'f':'m'}`:'darkelf_player';
 const frames=poly?.frames.idle||(amap.frames as Record<string,string[]>)[`${prefix}/idle`]||[];
 useEffect(()=>{const t=setInterval(()=>setFrame(f=>f+1),180);return()=>clearInterval(t);},[]);
 useEffect(()=>{if(!path.length)return;const t=setTimeout(()=>{const [next,...rest]=path;setPos(next);setPath(rest);if(!rest.length&&arrival.current){setSelected(arrival.current);setMessage(`已抵達 ${arrival.current.name}`);arrival.current=null;}},90);return()=>clearTimeout(t);},[path]);
 useEffect(()=>{const box=viewport.current;if(!box)return;const px=(pos.x+.5)*20*zoom,py=(pos.y+.5)*20*zoom;box.scrollTo({left:Math.max(0,px-box.clientWidth/2),top:Math.max(0,py-box.clientHeight/2),behavior:'auto'});},[pos,zoom]);
 function go(to:CityPoint,stop:Stop|null=null){if(busy)return;if(!cityWalkable(to)){setMessage('這裡是建築或障礙物，請選擇道路。');return;}const route=cityPath(pos,to);if(!route.length&&(pos.x!==to.x||pos.y!==to.y)){setMessage('目前無法抵達此處。');return;}setSelected(null);arrival.current=stop;setPath(route);setMessage(stop?`正在前往 ${stop.name}`:'移動中');if(!route.length){setSelected(stop);arrival.current=null;}}
 const nearby=selected&&Math.hypot(selected.x-pos.x,selected.y-pos.y)<=1.5;
 return <section className="prontera-city" aria-label="普隆德拉城市探索"><header><div><h3>普隆德拉 · 王國首都</h3><small>安全區域 · 點地移動 · {c.name}</small></div><Button variant="outline" onClick={onClose}>返回村莊</Button></header>
 <div className="prontera-toolbar"><label>快速前往 <select aria-label="選擇城市服務" value="" disabled={busy} onChange={e=>{const stop=stops.find(s=>s.id===e.target.value);if(stop)go(stop,stop);}}><option value="">選擇 NPC／入口</option>{stops.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>縮放 <select aria-label="地圖縮放" value={zoom} onChange={e=>setZoom(Number(e.target.value))}><option value={.7}>70%</option><option value={1}>100%</option><option value={1.3}>130%</option></select></label><Button variant="outline" onClick={()=>{arrival.current=null;setPath([]);setMessage('已停止移動');}}>停止</Button></div>
 <div className="prontera-viewport" ref={viewport}>
 <svg role="img" aria-label="普隆德拉地圖，建築不可穿越" viewBox="0 0 1024 1024" width={1280*zoom} height={1280*zoom} onClick={e=>{const r=e.currentTarget.getBoundingClientRect();go({x:Math.floor((e.clientX-r.left)/r.width*64),y:Math.floor((e.clientY-r.top)/r.height*64)});}}>
 <image href="/assets/prontera/ground.svg" width="1024" height="1024"/>
 {city.buildings.map(b=><g key={b.id}><image href={`/assets/prontera/${b.id}.svg`} x={b.x*16} y={b.y*16} width={b.width*16} height={b.height*16}/><text x={(b.x+b.width/2)*16} y={(b.y+b.height/2)*16} textAnchor="middle" className="prontera-building-label">{b.name}</text></g>)}
 <image href="/assets/prontera/fountain.svg" x="448" y="448" width="128" height="128"/>
 <text x="512" y="600" textAnchor="middle" className="prontera-building-label">中央噴泉廣場</text>
 {path.map(p=><circle key={`${p.x}:${p.y}`} cx={p.x*16+8} cy={p.y*16+8} r="2" fill="#fff5ac" pointerEvents="none"/>)}
 {stops.map(s=><g key={s.id} role="button" tabIndex={0} aria-label={`前往${s.name}`} onClick={e=>{e.stopPropagation();go(s,s);}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go(s,s);}}}><circle cx={s.x*16+8} cy={s.y*16+8} r="14" fill="transparent"/><circle cx={s.x*16+8} cy={s.y*16+8} r={s.kind==='npc'?6:9} fill={s.kind==='npc'?'#ffdb7b':'#bd97ec'} stroke="#302b29"/><text x={s.x*16+8} y={s.y*16-4} textAnchor="middle" className="prontera-npc-label">{s.name}</text></g>)}
 <g ref={actor} pointerEvents="none" transform={`translate(${pos.x*16+8} ${pos.y*16+8})`}><ellipse rx="10" ry="5" fill="#203c3299"/>{frames.length?<foreignObject x="-24" y="-48" width="48" height="48"><PlayerSpriteFrame src={frames[frame%frames.length]} formId={poly?.id} className="prontera-player" alt={c.name}/></foreignObject>:<circle r="8" fill="#fff"/>}<text y="18" textAnchor="middle" className="prontera-npc-label">{c.name}</text></g>
 </svg></div>
 <p role="status" className="prontera-status">{message} · 座標 {pos.x}, {pos.y}</p>
 {selected&&nearby&&<div className="prontera-service"><strong>{selected.name}</strong>{selected.kind==='portal'?<p>此入口通往{selected.name.replace('入口','')}，區域尚未開放。</p>:selected.id==='kafra'?<><p>使用永夜現有倉庫；其他地區傳送與存檔點服務尚未開放。</p><Button disabled={busy} onClick={()=>onService('bag')}>開啟行囊與倉庫</Button></>:selected.id==='refiner'?<><p>開啟行囊，選擇裝備後使用現有強化功能。</p><Button disabled={busy} onClick={()=>onService('bag')}>前往裝備強化</Button></>:CITY_VENDOR[selected.id]?<Button disabled={busy} onClick={()=>void onVendor(CITY_VENDOR[selected.id])}>開啟服務</Button>:<p>{selected.id==='card'?'打洞與插卡功能尚未開放。':selected.id==='board'?'每日懸賞任務尚未開放。':'歡迎來到普隆德拉。南門外區域尚未開放。'}</p>}<Button variant="outline" onClick={()=>setSelected(null)}>關閉對話</Button></div>}
 <small>主城探索第一版 · 建築採簡化素材；城外與室內區域建置中。</small>
 </section>;
}
