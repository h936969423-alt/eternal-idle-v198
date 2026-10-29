'use client';
import {useMemo,useState} from 'react';
import {Button} from '@/components/ui/button';
import {NPC_SERVICE_NOTICES} from '@/lib/game/npc-services';
import {availableMaterial} from '@/lib/game/npc-recipes';
import {mapPool} from '@/lib/game/map-pools';
import {mapIsOpen} from '@/lib/game/map-access';
import raw from '@/lib/game/gamedata.json';
import type {Character} from '@/lib/game/engine';
const data=raw as any;
export default function NpcSpecialServices({c,npc,busy,act}:{c:Character;npc:string;busy:boolean;act:(a:any)=>Promise<any>}){
 const [query,setQuery]=useState('');
 const zones=useMemo(()=>Object.entries(data.maps).filter(([zone])=>mapIsOpen(zone,c.mapAccess)).map(([zone])=>({zone,name:(Object.values(data.mapCategories).flat() as any[]).find(z=>z.v===zone)?.t||zone,mobs:mapPool(zone,c.mapPools).map(m=>c.monsterDefinitions?.[m.id]?.custom?.name||data.mobs[m.id]?.n||m.id)})),[c.mapAccess,c.mapPools,c.monsterDefinitions]);
 if(NPC_SERVICE_NOTICES[npc])return <section className="npc-stock"><p role="status">{NPC_SERVICE_NOTICES[npc]}</p><p className="section-hint">已保留原 NPC 服務資料；未接入的服務不扣金幣或材料。</p></section>;
 if(npc==='npc_refine')return <section className="npc-stock"><p>每次消耗武器與盔甲強化卷軸各 10 張。成功率 1%，成功後武器／盔甲祝福卷軸各 50%；失敗取得一件永夜普通獎池物品。</p><p className="section-hint">成功機率依阿肥公開說明；失敗獎池使用永夜現有普通物品，並非原站完整獎池。</p><p>武器卷軸：{availableMaterial(c,'scroll_weapon')}　盔甲卷軸：{availableMaterial(c,'scroll_armor')}</p><div className="progress-tabs">{[1,5,10].map(n=><Button key={n} disabled={busy||availableMaterial(c,'scroll_weapon')<n*10||availableMaterial(c,'scroll_armor')<n*10} onClick={()=>act({type:'npcRefine',n})}>提煉 {n} 次</Button>)}</div></section>;
 if(npc==='npc_elion')return <section className="npc-stock"><p>妖精需 Lv.30 並停止狩獵。首次選擇免費，更換屬性 500,000 金幣；已學魔法保留，異屬性魔法不可施放。</p><div className="progress-tabs">{Object.entries({fire:'火',water:'水',wind:'風',earth:'地'}).map(([element,name])=><Button key={element} variant={c.elfEle===element?'default':'outline'} disabled={busy||c.cls!=='elf'||c.lv<30||c.running||c.elfEle===element||!!c.elfEle&&c.gold<500000} onClick={()=>act({type:'elfElement',npc,element})}>{name}屬性{c.elfEle===element?' ✓':''}</Button>)}</div></section>;
 if(npc==='npc_obel')return <section className="npc-stock"><p>怪物位置查詢：輸入怪物或地圖名稱，查看永夜目前開放的出沒地點。</p><p className="section-hint">這是永夜地圖查詢；原站消耗搜索狀的追蹤服務尚未接入，因此不消耗搜索狀。</p><input aria-label="搜尋怪物出沒地圖" value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜尋怪物或地圖"/>{zones.filter(z=>query&&(z.name.includes(query)||z.mobs.some(n=>n.includes(query)))).slice(0,30).map(z=><div className="auto-card" key={z.zone}><strong>{z.name}</strong><p>{z.mobs.join('、')}</p><Button disabled={busy} onClick={()=>act({type:'zone',zone:z.zone})}>前往地圖</Button></div>)}</section>;
 return <p>此服務目前沒有可操作的項目。</p>;
}
