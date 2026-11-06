'use client';
import ItemIcon from './item-icon';
import './backpack-reference.css';
import {SPEAKING_SCROLL} from '@/lib/game/scroll-map-data';
import {affixLabel,blessingLines,affixGlow} from '@/lib/game/affix-rules';
import {itemRarity} from '@/lib/game/loot-appearance';
import GearName from './gear-name';
import DollPanel from './doll-panel';
import {useState,type ReactNode} from 'react';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import type {Character} from '@/lib/game/engine';
import raw from '@/lib/game/gamedata.json';
import legacyEquipment from '@/lib/game/lineagew-equipment-removal.json';
import amap from '@/lib/game/asset-map.json';
import {backpackRows,inventoryRows} from '@/lib/game/inventory';
import {saleCandidates} from '@/lib/game/sell-unused';
const items=raw.items as Record<string,any>,icons=amap.icons.items as Record<string,string>;
const slots=[['weapon','武器'],['helm','頭盔'],['amulet','項鍊'],['tshirt','內衣'],['armor','盔甲'],['cloak','斗篷'],['gloves','手套'],['shield','盾牌／臂甲'],['belt','腰帶'],['ring','戒指 1'],['boots','靴子'],['ring2','戒指 2'],['doll','魔法娃娃'],['ear1','耳環 1'],['ear2','耳環 2'],['pants','脛甲'],['runeRight','右符文'],['runeLeft','左符文'],['runeMiddle','中符文'],['talisman1','護符 1'],['talisman2','護符 2'],['talisman3','護符 3']];
const legacySlots:Record<string,string>={armor:'body',helm:'head',gloves:'glove',tshirt:'shirt'};
export function EquipmentSlots({c,inspect,portraitSrc,busy,unequip}:{c:Character;inspect:(id:string)=>void;portraitSrc?:string;busy?:boolean;unequip?:(slot:string)=>Promise<any>}){

 return <><div className={`source-eq-grid${portraitSrc?" character-equipment-grid":""}`}>{portraitSrc&&<figure className="character-equipment-portrait"><img src={portraitSrc} alt="角色外觀"/><figcaption>{c.name} · Lv.{c.lv}</figcaption></figure>}{slots.map(([slot,name])=>{const actualSlot=c.equipment[slot]?slot:legacySlots[slot]??slot;const equipped=c.equipment[actualSlot],id=slot==='doll'?c.doll:equipped?.id,base=id?.split('@')[0]??'',item=items[base],legacy=(legacyEquipment.items as Record<string,{n:string}>)[base];return <button data-item-rarity={id?itemRarity(id,c.lootAppearance):undefined} className={`source-eq-slot ${id?'filled':''}`} key={slot} disabled={!id||!!unequip&&busy} onClick={()=>{if(!id)return;if(unequip)return unequip(actualSlot);if(item)inspect(id);}}><span>{name}</span>{id?<>{item&&<ItemIcon itemId={id!} appearance={c.lootAppearance} className={affixGlow(c,id!)} src={item.sourceIcon||icons[item.n]} alt={item.n}/>}<strong>{item?<GearName c={c} item={id}/>:legacy?.n??(slot==='doll'?'魔法娃娃':'舊版裝備')}</strong>{id&&affixLabel(c,id)&&<small className="affix-badge">{affixLabel(c,id)}</small>}{c.locked?.includes(id!)&&<small>🔒</small>}</>:<strong>－</strong>}</button>;})}</div><p className="section-hint">{unequip?"點一下已穿戴的裝備即可卸下。":"點已穿戴欄位查看能力及卸下裝備。"}</p></>;
}
export default function InventoryPanel({c,busy,act,inspect,warehouse}:{c:Character;busy:boolean;act:(a:any)=>Promise<any>;inspect:(id:string)=>void;warehouse:ReactNode}){const [category,setCategory]=useState('all'),[query,setQuery]=useState(''),[confirm,setConfirm]=useState(false),[extra,setExtra]=useState<string[]>([]);const [selected,setSelected]=useState<string|null>(null),[sort,setSort]=useState('default');const rows=backpackRows(c),sale=saleCandidates(c,extra),total=sale.reduce((n,r)=>n+r.total,0);const wornSlots=new Map(Object.entries(c.equipment).reverse().map(([slot,gear])=>[gear.id,slot]));
const wearable=(row:ReturnType<typeof inventoryRows>[number])=>['wpn','arm','acc'].includes(row.cat)&&!row.stats.noEquip&&!row.stats.isArrow&&!/^pet/.test(row.stats.slot||'')&&!row.stats.doll;
const displayRows=inventoryRows(c).flatMap(row=>{
 const backpack=rows.find(entry=>entry.key===row.key);
 return wearable(row)&&row.equipped?[{...row,cnt:backpack?.cnt||0}]:backpack?[backpack]:[];
});
const visible=displayRows.filter(r=>(!query||r.n.includes(query))&&(category==='all'||category==='equipment'&&['wpn','arm','acc'].includes(r.cat)||category==='consume'&&['pot','scroll','skillbk'].includes(r.cat)||category===r.cat));
if(sort==='name')visible.sort((a,b)=>a.n.localeCompare(b.n,'zh-Hant'));
if(sort==='count')visible.sort((a,b)=>b.cnt-a.cnt);
const selectedRow=visible.find(row=>row.key===selected);
return <section className="source-inventory reference-backpack"><Tabs defaultValue="bag"><TabsList><TabsTrigger value="bag">背包</TabsTrigger><TabsTrigger value="worn">裝備欄</TabsTrigger><TabsTrigger value="warehouse">倉庫</TabsTrigger><TabsTrigger value="dolls">娃娃</TabsTrigger></TabsList><TabsContent value="warehouse">{warehouse}</TabsContent><TabsContent value="dolls"><DollPanel c={c} busy={busy} act={act} inspect={inspect}/></TabsContent><TabsContent value="worn"><EquipmentSlots c={c} inspect={inspect}/></TabsContent><TabsContent value="bag"><div className="backpack-currency"><span>🟡 天幣 {c.gold.toLocaleString()}</span><small>使用 {rows.length} 格</small></div><div className="source-bag-categories">{[['all','全部'],['equipment','裝備'],['consume','消耗'],['mat','材料']].map(([id,name])=><Button variant={category===id?'default':'outline'} key={id} aria-pressed={category===id} onClick={()=>{setCategory(id);setSelected(null);}}>{name}</Button>)}</div><div className="bag-actions"><Input aria-label="搜尋物品" placeholder="搜尋物品" value={query} onChange={e=>{setQuery(e.target.value);setSelected(null);}}/><select aria-label="排序" value={sort} onChange={e=>setSort(e.target.value)}><option value="default">排序：預設</option><option value="name">排序：名稱</option><option value="count">排序：數量</option></select></div><div className="source-bag-grid">{visible.map((r,index)=><div className="backpack-slot-wrap" key={r.key}><button className="source-bag-cell" aria-pressed={selected===r.key} title={r.n} aria-label={`${r.n} ×${r.cnt} +${r.en}${r.lock?' 已鎖定':''}${r.autoSell?' 已設定自動賣出':''}`} aria-disabled={wearable(r)&&busy||undefined} onClick={()=>{
 if(r.key===SPEAKING_SCROLL)return act({type:'useScroll',item:r.key});
 if(!wearable(r)){setSelected(selected===r.key?null:r.key);return;}
 if(busy)return;
 setSelected(r.key);
 const slot=wornSlots.get(r.key);
 return act(slot?{type:'unequip',slot}:{type:'equip',item:r.key});
}}>{(items[r.id]?.sourceIcon||icons[r.n])?<ItemIcon itemId={r.key} appearance={c.lootAppearance} size={32} className={affixGlow(c,r.key)} src={items[r.id]?.sourceIcon||icons[r.n]} alt={r.n}/>:<span className="unknown-doll-icon" aria-hidden="true">🪆</span>}{r.cnt>1&&<span className="count">{r.cnt}</span>}{r.en>0&&<span className="enhance">+{r.en}</span>}{r.lock&&<span className="locked">🔒</span>}{r.equipped&&<span className="worn">穿戴</span>}{r.autoSell&&<span className="auto-sale-mark" aria-hidden="true">💰</span>}</button>{selected===r.key&&<div className={`backpack-tooltip ${index%4>=2?'backpack-tooltip-left':''}`} role="status"><strong>{r.en>0?`+${r.en} `:''}{r.n}</strong>{r.stats.ac!=null&&<span>防禦：{r.stats.ac}</span>}{r.stats.dmgS!=null&&<span>傷害：{r.stats.dmgS}／{r.stats.dmgL??r.stats.dmgS}</span>}<span>重量：{r.stats.weight??0}</span>{r.enhanceable&&<span>強化：+{r.safe} 前可安全強化</span>}{r.description&&<span>{r.description}</span>}</div>}</div>)}{Array.from({length:Math.max(0,24-visible.length)},(_,n)=><div className="source-bag-cell empty" key={`empty-${n}`}/>)}</div><div className="backpack-command-bar"><Button variant="outline" disabled={!selectedRow} onClick={()=>selectedRow&&inspect(selectedRow.key)}>查詢</Button><Button variant="outline" disabled={busy||!selectedRow} onClick={()=>selectedRow&&inspect(selectedRow.key)}>物品操作</Button><Button variant="outline" onClick={()=>{setSort(sort==='name'?'default':'name');setSelected(null);}}>整理</Button><Button variant="outline" disabled={busy||!rows.length} onClick={()=>setConfirm(true)}>販售</Button></div></TabsContent></Tabs><Dialog open={confirm} onOpenChange={setConfirm}><DialogContent className="game-dialog sale-dialog"><DialogTitle>一鍵販售清單</DialogTitle><DialogDescription>預設販售未穿戴的普通裝備。鎖定、強化、詞綴與控制戒指受保護；其他物品需自行勾選。</DialogDescription><div className="sale-list">{sale.map(r=><p key={r.key}>{r.name} ×{r.quantity}<strong>{r.total.toLocaleString()} 金幣</strong></p>)}{!sale.length&&<p>目前沒有可販售物品。</p>}<h3>其他物品（自行選擇）</h3>{rows.filter(r=>!['wpn','arm','acc'].includes(r.cat)&&!r.nosell&&!r.lock).map(r=><label key={r.key}><Checkbox checked={extra.includes(r.key)} onCheckedChange={v=>setExtra(v?[...extra,r.key]:extra.filter(k=>k!==r.key))}/>{r.n} ×{r.cnt}</label>)}</div><strong>合計 {sale.reduce((n,r)=>n+r.quantity,0)} 件 · {total.toLocaleString()} 金幣</strong><Button className="gold-button" disabled={busy||!sale.length} onClick={async()=>{if(await act({type:'sellUnused',extra})){setConfirm(false);setExtra([]);}}}>確認一鍵販售</Button></DialogContent></Dialog></section>;
}
