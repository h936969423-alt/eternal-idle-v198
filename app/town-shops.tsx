'use client';
import ItemIcon from './item-icon';
import ItemLabel from './item-label';
import GilenSpellShop,{useGilenDialogViewport} from './gilen-spell-shop';
import {isGilenTeacher} from '@/lib/game/npc-magic';
import {useEffect,useState} from 'react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import raw from '@/lib/game/gamedata.json';
import amap from '@/lib/game/asset-map.json';
import type {BattleView} from './use-combat-replay';
import TownWalker from './town-walker';
import {sceneBackground} from '@/lib/game/scene-presentation';
import DollPanel from './doll-panel';
import NpcBlessPanel from './npc-bless-panel';
import NpcRecipeList from './npc-recipe-list';
import NpcSpecialServices from './npc-special-services';
import {merchantInventory} from '@/lib/game/vendors';
import {npcVisible,findNpc,townNpcs,npcOriginalService} from '@/lib/game/npc-config';
import {NPC_HUB,NPC_HUB_ZONE,hubGroup} from '@/lib/game/npc-hub';
import type {Character} from '@/lib/game/engine';
const towns=raw.towns as Record<string,any>,items=raw.items as Record<string,any>,icons=amap.icons.items as Record<string,string>;
const groups={all:'全部',shops:'商店',craft:'製作／兌換',classes:'職業／養成',other:'其他服務',events:'活動'};
export default function TownShops({c,busy,act,inspect,onService,compact=false,battle}:{c:Character;busy:boolean;act:(a:any)=>Promise<any>;inspect:(id:string)=>void;onService:(tab:string)=>void;compact?:boolean;battle?:BattleView}){
 const [vendor,setVendor]=useState<string|null>(null),[query,setQuery]=useState(''),[npcQuery,setNpcQuery]=useState(''),[group,setGroup]=useState('all');
 const npc=vendor&&npcVisible(NPC_HUB_ZONE,vendor,c.npcConfig)?findNpc(NPC_HUB_ZONE,vendor,c.npcConfig):null;
 const prices=vendor?merchantInventory(NPC_HUB_ZONE,vendor,c.npcConfig):{},gilen=!!npc&&isGilenTeacher(NPC_HUB_ZONE,npc),gilenStyle=useGilenDialogViewport(gilen);
 const stock=vendor?Object.keys(prices).filter(id=>!query||items[id]?.n.includes(query)):[];
 const here=c.zone===NPC_HUB_ZONE,serviceBusy=busy||!here;
 useEffect(()=>{if(vendor&&(!here||!npcVisible(NPC_HUB_ZONE,vendor,c.npcConfig)))setVendor(null);},[vendor,here,c.npcConfig]);
 const open=async(id:string)=>{if(!here&&!await act({type:'zone',zone:NPC_HUB_ZONE}))return;setQuery('');setVendor(id);};
 const npcs=townNpcs(NPC_HUB_ZONE,c.npcConfig).filter(n=>npcVisible(NPC_HUB_ZONE,n.id,c.npcConfig));
 const shown=npcs.filter(n=>{const original=NPC_HUB.npcs.find(o=>o.id===n.id);return (group==='all'||hubGroup(n.id)===group)&&(!npcQuery||[n.n,n.title,n.d,...(original?.sources.map(s=>s.name)||[])].some(text=>text.includes(npcQuery)));});
 return <section className={`town-shops ${compact?'compact-village':''}`} style={compact?{backgroundImage:`linear-gradient(#17120c66,#17120c88),url('${sceneBackground(c.zone)}')`}:undefined}>
  {compact&&<TownWalker c={c} view={battle}/>}<div className="shop-banner"><div><h2>{here?'銀騎士村 · NPC 服務中心':towns[c.zone]?.n||'村莊 NPC'}</h2><p>目前：{towns[c.zone]?.n||'狩獵區'} · {c.gold.toLocaleString()} 金幣</p></div></div>
  {(!compact||here)?<><p className="section-hint">各村 NPC 已集中銀騎士村。同類服務由一位代表整合；可搜尋原 NPC 名稱找到對應服務。</p>{!here&&<Button disabled={busy} onClick={()=>act({type:'zone',zone:NPC_HUB_ZONE})}>前往銀騎士村</Button>}
   <div className="npc-hub-tools"><Input aria-label="搜尋 NPC 或服務" value={npcQuery} onChange={e=>setNpcQuery(e.target.value)} placeholder="搜尋 NPC、原 NPC 名稱或服務"/><div className="progress-tabs" role="group" aria-label="NPC 服務分類">{Object.entries(groups).map(([id,label])=><Button key={id} variant={group===id?'default':'outline'} onClick={()=>setGroup(id)}>{label}</Button>)}</div></div>
   <div className="village-npc-grid">{shown.map(n=><article className={vendor===n.id?'selected':''} key={n.id}><h3>{n.n}</h3><strong>{n.title}</strong><p>{n.d}</p>{n.type==='warehouse'?<Button disabled={busy} onClick={async()=>{if(!here&&!await act({type:'zone',zone:NPC_HUB_ZONE}))return;onService('bag');}}>開啟倉庫</Button>:n.type==='skill'&&!isGilenTeacher(NPC_HUB_ZONE,n)?<Button disabled={busy} onClick={()=>onService('skills')}>開啟魔法</Button>:n.type==='blackmarket'?<Button disabled={busy||c.lv<41||c.gold<300000} onClick={async()=>{if(!here&&!await act({type:'zone',zone:NPC_HUB_ZONE}))return;await act({type:'gacha',npc:n.id});}}>黑市抽取 · 300,000</Button>:<Button disabled={busy} onClick={()=>open(n.id)}>{n.type==='shop'?(isGilenTeacher(NPC_HUB_ZONE,n)?'學習 1～3 級魔法':'開啟販售清單'):['craft','exchange','quest'].includes(n.type)?'開啟製作／兌換':n.type==='event'?'查看活動商品／兌換':'開啟服務'}</Button>}</article>)}</div>{!shown.length&&<p>沒有符合的 NPC，請調整分類或搜尋。</p>}
  </>:<div className="auto-card"><p>所有 NPC 服務已移至銀騎士村。</p><Button disabled={busy} onClick={()=>act({type:'zone',zone:NPC_HUB_ZONE})}>前往銀騎士村 NPC 服務中心</Button></div>}
  <Dialog open={!!npc} onOpenChange={v=>{if(!v)setVendor(null);}}><DialogContent positioning={gilen?'viewport':'center'} style={gilen?gilenStyle:undefined} className={gilen?'gilen-dialog':npc?.id==='npc_bian'?'game-dialog npc-shop-dialog bian-dialog':'game-dialog npc-shop-dialog'} showCloseButton={!gilen&&npc?.id!=='npc_bian'}>
   {gilen?<GilenSpellShop key={`${c.id}:${vendor}`} c={c} zone={NPC_HUB_ZONE} npcId={vendor!} name={npc?.n} busy={serviceBusy} act={act} onClose={()=>setVendor(null)}/>:<><DialogTitle>{npc?`${npc.n} · ${npc.title}`:'NPC 服務'}</DialogTitle><DialogDescription>銀騎士村集中服務；金幣、材料及資格皆由伺服器確認。</DialogDescription>
    {npc&&npcOriginalService(NPC_HUB_ZONE,npc.id,c.npcConfig)&&(['craft','exchange','quest','event'].includes(npc.type))&&<NpcRecipeList key={npc.id} c={c} npc={npc.id} busy={serviceBusy} act={act}/>}
    {npc?.id==='npc_doll_merchant'&&npcOriginalService(NPC_HUB_ZONE,npc.id,c.npcConfig)&&<DollPanel c={c} busy={serviceBusy} act={act} inspect={inspect}/>}
    {npc?.id==='npc_bian'&&npcOriginalService(NPC_HUB_ZONE,npc.id,c.npcConfig)&&<NpcBlessPanel key={c.id} c={c} busy={serviceBusy} act={act} onClose={()=>setVendor(null)}/>}
    {npc&&['refine','attribute','tracking','pray','pledge','ally','legend','rename','auction'].includes(npc.type)&&<NpcSpecialServices key={npc.id} c={c} npc={npc.id} busy={serviceBusy} act={act}/>}
    {npc&&['shop','event'].includes(npc.type)&&<section className="npc-stock"><p className="section-hint">法書購買後，至背包點「使用」學習。已移植的永夜裝備沿用永夜價格；箭矢依永夜補給規則每支 1 金幣。</p>{npc.type==='event'&&<p>寒霜商品：10/29 12:30～11/3 12:30；+9 寒霜武器兌換至 11/4 12:30（台灣時間）。</p>}<Input aria-label="搜尋 NPC 商品" placeholder="搜尋 NPC 商品" value={query} onChange={e=>setQuery(e.target.value)}/><div className="shop-list">{stock.map(id=><div className="shop-row" key={id}><button onClick={()=>inspect(id)}><ItemIcon itemId={id} appearance={c.lootAppearance} src={items[id].sourceIcon||icons[items[id].n]} alt={items[id].n}/><span><strong><ItemLabel item={id} appearance={c.lootAppearance}/></strong><small>{typeof items[id].d==='string'?items[id].d:''}</small></span></button><div><strong>{prices[id].toLocaleString()} 金幣</strong><Button disabled={serviceBusy||c.gold<prices[id]} onClick={()=>act({type:'buy',npc:npc.id,item:id,n:1})}>購買</Button>{(['pot','scroll'].includes(items[id].type)||items[id].isArrow)&&<Button variant="outline" disabled={serviceBusy||c.gold<prices[id]*10} onClick={()=>act({type:'buy',npc:npc.id,item:id,n:10})}>×10</Button>}</div></div>)}</div>{!stock.length&&<p>沒有符合的商品，或活動販售期間已結束。</p>}</section>}
    {npc?.type==='info'&&<p>{npc.d}</p>}
   </>}
  </DialogContent></Dialog>
 </section>;
}
