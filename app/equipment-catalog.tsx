'use client';
import ItemIcon from './item-icon';
import ItemLabel from './item-label';
import {useItemAppearance} from './item-appearance-context';
import {itemDisplayName} from '@/lib/game/loot-appearance';
import {useMemo,useState} from 'react';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import catalog from '@/lib/game/reference-equipment.json';
import raw from '@/lib/game/gamedata.json';
const items=raw.items as Record<string,any>,PAGE_SIZE=48;
const catalogRows=catalog.items;
const classNames:Record<string,string>={royal:'王族',knight:'騎士',elf:'妖精',mage:'法師',dark:'黑暗妖精',illusion:'幻術士',dragon:'龍騎士',warrior:'戰士'};
export default function EquipmentCatalog({inspect}:{inspect:(id:string)=>void}){
 const appearance=useItemAppearance();
 const [query,setQuery]=useState(''),[category,setCategory]=useState('全部'),[page,setPage]=useState(0);
 const rows=useMemo(()=>catalogRows.filter(i=>(category==='全部'||i.category===category)&&(!query||`${itemDisplayName(i.id,appearance)} ${i.name} ${i.sourceId}`.toLowerCase().includes(query.toLowerCase()))),[category,query,appearance]);
 const pages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE)),current=Math.min(page,pages-1);
 return <section><div className="filter-bar"><Input aria-label="搜尋裝備圖鑑" placeholder="搜尋裝備名稱或編號…" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/><Select value={category} onValueChange={v=>{setCategory(v);setPage(0);}}><SelectTrigger className="picker" aria-label="裝備分類"><SelectValue/></SelectTrigger><SelectContent>{[...new Set(['全部',...Object.keys(catalog.counts)])].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div><p className="section-hint">永夜 裝備與其他保留裝備 · {rows.length}／{catalogRows.length} 件。英雄 147 件（紅）、傳說 151 件（紫）。神話 51 件（金）；詳情顯示目前強化能力。</p><div className="catalog-grid">{rows.slice(current*PAGE_SIZE,(current+1)*PAGE_SIZE).map(row=>{const i=items[row.id];return <button key={row.id} className="catalog-card" onClick={()=>inspect(row.id)}><ItemIcon itemId={row.id} className="asset-icon" src={row.icon} alt={itemDisplayName(row.id,appearance)} loading="lazy"/><strong><ItemLabel item={row.id}/></strong><small>{row.category} · {i.type==='wpn'?`小怪 ${i.dmgS}／大怪 ${i.dmgL}`:i.ac!==undefined?`AC ${-i.ac}`:i.slot}</small><small>{String(i.req).split(',').map(v=>classNames[v]||v).join('、')}</small></button>;})}</div>{!rows.length&&<p className="section-hint">沒有符合的裝備。</p>}<div className="filter-bar" aria-label="圖鑑分頁"><Button variant="outline" disabled={current===0} onClick={()=>setPage(current-1)}>上一頁</Button><span>{current+1}／{pages}</span><Button variant="outline" disabled={current+1>=pages} onClick={()=>setPage(current+1)}>下一頁</Button></div></section>;
}
