'use client';
import {useCallback,useEffect,useMemo,useRef,useState,type CSSProperties} from 'react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {BLACK_MARKET_RANKS,blackMarketPools,blackMarketQuote,type BlackMarketReceipt,type BlackMarketRank} from '@/lib/game/black-market';
import {RARITY_COLORS,RARITY_NAMES,itemDisplayName,type LootAppearanceConfig} from '@/lib/game/loot-appearance';
import type {Character} from '@/lib/game/engine';
import raw from '@/lib/game/gamedata.json';
import assets from '@/lib/game/asset-map.json';
import ItemIcon from './item-icon';
import ItemLabel from './item-label';
import './black-market.css';
const items=raw.items as Record<string,any>,icons=assets.icons.items as Record<string,string>;
type Pools=Record<BlackMarketRank,string[]>;
export function BlackMarketPool({pools,appearance,inspect}:{pools:Pools;appearance?:LootAppearanceConfig;inspect:(id:string)=>void}){
 return <><p className="market-pool-note">普通、高級、稀有各占 1/3（約 33.33%）；同品質內每件物品等機率。</p><div className="market-pool-groups">{BLACK_MARKET_RANKS.map(rank=><details key={rank} style={{'--market-color':RARITY_COLORS[rank]} as CSSProperties}><summary><strong>{RARITY_NAMES[rank]} · 1/3</strong><span>{pools[rank].length} 種</span></summary><div className="market-pool-chips">{pools[rank].map(id=><button key={id} onClick={()=>inspect(id)}>{itemDisplayName(id,appearance)}</button>)}</div></details>)}</div></>;
}
export default function BlackMarket({c,npc,name='潘朵拉',busy,act,inspect,onClose}:{c:Character;npc:string;name?:string;busy:boolean;act:(a:any)=>Promise<any>;inspect:(id:string)=>void;onClose:()=>void}){
 const [poolOpen,setPoolOpen]=useState(false),[rolling,setRolling]=useState(false),[submitting,setSubmitting]=useState(false),[retry,setRetry]=useState(false),[preview,setPreview]=useState<string>(),[result,setResult]=useState<BlackMarketReceipt|null>(c.blackMarket?.history[0]||null);
 const pending=useRef<{requestId:string;sequence:number;count:1|10}|null>(null),locked=useRef(false),started=useRef(0),shown=useRef(''),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const pools=useMemo(()=>blackMarketPools(c.lootAppearance),[c.lootAppearance]),all=useMemo(()=>BLACK_MARKET_RANKS.flatMap(rank=>pools[rank]),[pools]),progress=c.blackMarket?.progress||0;
 const one=blackMarketQuote(progress,1),ten=blackMarketQuote(progress,10),ready=BLACK_MARKET_RANKS.every(rank=>pools[rank].length>0),working=busy||submitting||rolling;
 const finish=useCallback((receipt:BlackMarketReceipt)=>{
  if(shown.current===receipt.id)return;shown.current=receipt.id;pending.current=null;setRetry(false);
  clearTimeout(timer.current);timer.current=setTimeout(()=>{setResult(receipt);setRolling(false);},Math.max(0,started.current+900-performance.now()));
 },[]);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 useEffect(()=>{const p=pending.current;if(!p)return;const receipt=c.blackMarket?.history.find(r=>r.requestId===p.requestId);if(receipt)finish(receipt);},[c.blackMarket,finish]);
 useEffect(()=>{if(!rolling||!all.length)return;let i=0;setPreview(all[0]);const interval=setInterval(()=>{i=(i+7)%all.length;setPreview(all[i]);},85);return()=>clearInterval(interval);},[rolling,all]);
 async function draw(count:1|10){
  if(locked.current||working||pending.current&&pending.current.count!==count)return;
  const request=pending.current||{count,requestId:crypto.randomUUID(),sequence:(c.blackMarket?.sequence||0)+1};pending.current=request;
  locked.current=true;setSubmitting(true);setRolling(true);setRetry(false);setResult(null);started.current=performance.now();
  try{
   const response=await act({type:'gacha',npc,n:request.count,requestId:request.requestId,sequence:request.sequence});
   const character=response?.save?.characters.find((ch:Character)=>ch.id===c.id) as Character|undefined,receipt=character?.blackMarket?.history.find(r=>r.requestId===request.requestId);
   if(receipt)finish(receipt);else if(pending.current){setRolling(false);setRetry(true);}
  }catch{setRolling(false);setRetry(true);}finally{locked.current=false;setSubmitting(false);}
 }
 const prizes=useMemo(()=>{const out=new Map<string,{item:string;rank:BlackMarketRank;count:number}>();for(const row of result?.items||[]){const previous=out.get(row.item);out.set(row.item,{...row,count:(previous?.count||0)+1});}return [...out.values()];},[result]);
 const displayed=rolling?preview:result?.items[0]?.item,rank=!rolling?result?.items[0]?.rank:undefined;
 const unavailable=(count:1|10,cost:number)=>working||c.lv<41||!ready||(!retry&&c.gold<cost)||!!pending.current&&pending.current.count!==count;
 return <section className="black-market" aria-busy={working}>
  <header className="market-header"><DialogTitle>{name}的黑市</DialogTitle><strong>💰 {c.gold.toLocaleString()}</strong></header>
  <DialogDescription className="market-intro">普通／高級／稀有各占 1/3；同品質內等機率抽取。</DialogDescription>
  <div className="market-body">
   <div className={`market-stage ${rolling?'rolling':''}`} style={{'--market-color':rank?RARITY_COLORS[rank]:'#a38b58'} as CSSProperties}>
    {displayed&&(items[displayed]?.sourceIcon||icons[items[displayed]?.n])?<ItemIcon itemId={displayed} appearance={c.lootAppearance} src={items[displayed]?.sourceIcon||icons[items[displayed]?.n]} alt={rolling?'抽獎轉動中':itemDisplayName(displayed,c.lootAppearance)} size={88}/>:<span aria-hidden="true" className="market-emblem">✦</span>}
   </div>
   <p className="market-status" role="status">{rolling?'命運的輪盤轉動中…':retry?'尚未確認抽獎結果，請按原按鈕重試確認。':result?`恭喜獲得 ${result.count===1?itemDisplayName(result.items[0].item,c.lootAppearance):result.count+' 件物品'}！`:'選擇單抽或十連抽，開啟你的幸運。'}</p>
   {!!result&&!rolling&&<><div className="market-results">{prizes.map(prize=><button key={prize.item} style={{'--market-color':RARITY_COLORS[prize.rank]} as CSSProperties} onClick={()=>inspect(prize.item)}><ItemLabel item={prize.item} appearance={c.lootAppearance}/><b>×{prize.count}</b></button>)}</div><p className="market-receipt">已入帳 · 花費 {result.cost.toLocaleString()} 金幣{result.free?` · 免費 ${result.free} 次`:''}</p></>}
   <div className="market-progress"><p>累計付費抽獎 <b>{progress}/10</b></p><small>{progress===10?'下一抽免費！':'滿 10 次，下一抽免費'}</small><div role="progressbar" aria-label="免費抽獎進度" aria-valuemin={0} aria-valuemax={10} aria-valuenow={progress}><span style={{width:`${progress*10}%`}}/></div></div>
   {c.lv<41&&<p role="status">需要 Lv.41 才能抽獎；可先查看獎池。</p>}
   {!ready&&<p role="status">三種品質獎池尚未完整，暫停抽獎。</p>}
  </div>
  <footer className="market-actions">
   <Button className="gold-button" data-draw-count="1" disabled={unavailable(1,one.cost)} onClick={()=>draw(1)}>{retry&&pending.current?.count===1?'確認單抽結果':one.free?'免費抽獎':`單抽 ${one.cost.toLocaleString()}`}</Button>
   <Button className="gold-button" data-draw-count="10" disabled={unavailable(10,ten.cost)} onClick={()=>draw(10)}>{retry&&pending.current?.count===10?'確認十連抽結果':`十連抽 ${ten.cost.toLocaleString()}${ten.free?'（含 1 次免費）':''}`}</Button>
   <Button variant="outline" className="market-prizes-button" disabled={working} onClick={()=>setPoolOpen(true)}>獎勵查看</Button>
   <Button variant="outline" disabled={working} onClick={onClose}>關閉</Button>
  </footer>
  <Dialog open={poolOpen} onOpenChange={setPoolOpen}><DialogContent className="game-dialog black-market-pool-dialog"><DialogTitle>{name}獎勵一覽</DialogTitle><DialogDescription className="sr-only">各品質的抽中機率與完整物品清單</DialogDescription><BlackMarketPool pools={pools} appearance={c.lootAppearance} inspect={inspect}/><Button className="gold-button" onClick={()=>setPoolOpen(false)}>關閉獎池</Button></DialogContent></Dialog>
 </section>;
}
