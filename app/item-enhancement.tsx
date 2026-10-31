'use client';
import {useCallback,useEffect,useRef,useState,type CSSProperties} from 'react';
import {Button} from '@/components/ui/button';
import {AlertDialog,AlertDialogContent,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel} from '@/components/ui/alert-dialog';
import {hasUnlimitedWeaponGrowth,weaponGrowth} from '@/lib/game/weapon-enhancement';
import {enhancementInfo,baseItem} from '@/lib/game/gear';
import {enhancementChanges,type EnhancementChange} from '@/lib/game/enhancement-comparison';
import type {EnhancementReceipt} from '@/lib/game/enhancement-result';
import type {Character} from '@/lib/game/engine';
import {itemDisplayName} from '@/lib/game/loot-appearance';
import raw from '@/lib/game/gamedata.json';
import assets from '@/lib/game/asset-map.json';
import ItemIcon from './item-icon';
import EnhancementSafety from './enhancement-safety';
import './item-enhancement.css';
const items=raw.items as Record<string,any>,icons=assets.icons.items as Record<string,string>;
const modes=[['normal','一般強化'],['blessed','祝福強化'],['safe','一鍵安定'],['refined','精煉強化']];
const pct=(n:number)=>(n*100).toFixed(2).replace(/\.00$/,'')+'%';
const number=(n:number)=>Number(n.toFixed(3)).toLocaleString();
type Info=ReturnType<typeof enhancementInfo>;
type Phase='select'|'charging'|'ready'|'revealing'|'result'|'retry';
const target=(info:Info)=>info.gainMin===info.gainMax?'+'+Math.min(info.cap,info.en+info.gainMin):'+'+Math.min(info.cap,info.en+info.gainMin)+'～+'+Math.min(info.cap,info.en+info.gainMax);
function EquipmentIcon({id,c,size=88}:{id:string;c:Character;size?:number}){const item=items[baseItem(id)],src=item?.sourceIcon||icons[item?.n];return src?<ItemIcon itemId={id} appearance={c.lootAppearance} src={src} alt={itemDisplayName(id,c.lootAppearance)} size={size}/>:<span className="enhancement-placeholder" aria-hidden="true">✦</span>;}
export function EnhancementResultPanel({result,changes=[]}:{result:EnhancementReceipt;changes?:EnhancementChange[]}){
 return <section className={'enhancement-result '+result.outcome} role="status"><h3>{result.outcome==='success'?'強化成功':result.outcome==='hold'?'強化維持':'強化失敗'}</h3><p className="enhancement-level-result">+{result.from} <span>→</span> {result.to===null?'裝備消失':'+'+result.to}</p><p>{result.outcome==='destroyed'?'選中的這件裝備已消失。':result.outcome==='hold'?'裝備保留，強化值維持不變。':'裝備強化與能力已更新。'}</p>{!!changes.length&&<dl className="enhancement-change-list">{changes.map(row=><div key={row.label}><dt>{row.label}</dt><dd>{number(row.before)} <span>→</span> <b>{number(row.after)}</b></dd></div>)}</dl>}<small>已消耗 {items[result.scroll]?.n||result.scroll} ×{result.consumed}</small></section>;
}
/** auto: start the given enhancement immediately (no method choice or confirmation),
 * play the same charging animation and reveal the result automatically. */
export default function ItemEnhancement({c,item,busy,act,onDone,onBusyChange,auto}:{c:Character;item:string;busy:boolean;act:(a:any)=>Promise<any>;onDone:(key:string|null)=>void;onBusyChange?:(busy:boolean)=>void;auto?:'normal'|'safe'}){
 const [selected,setSelected]=useState(item),[mode,setMode]=useState<string>(auto||'normal'),autoRun=useRef(!!auto),[phase,setPhase]=useState<Phase>('select'),[confirm,setConfirm]=useState(false),[result,setResult]=useState<EnhancementReceipt|null>(null),[changes,setChanges]=useState<EnhancementChange[]>([]);
 const latest=useRef(c);latest.current=c;
 const inFlight=useRef(false),pending=useRef<{requestId:string;sequence:number;item:string;mode:string;expectedEn:number;info:Info}|null>(null),frozen=useRef<Info|null>(null),started=useRef(0),received=useRef(''),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const options=modes.map(([id,name])=>{try{return {id,name,info:enhancementInfo(c,selected,id),error:''};}catch(error){return {id,name,info:null,error:error instanceof Error?error.message:'不可強化'};}});
 const current=options.find(row=>row.id===mode)?.info,display=current&&phase==='select'?current:frozen.current;
 const active=phase==='charging'||phase==='ready'||phase==='revealing',resultVisible=phase==='result',outcome=(phase==='revealing'||resultVisible)?result?.outcome:undefined;
 useEffect(()=>{onBusyChange?.(active);return()=>onBusyChange?.(false);},[active,onBusyChange]);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 // A stalled recovery request must not keep the charging screen locked forever.
 useEffect(()=>{if(phase!=='charging')return;const timeout=setTimeout(()=>{if(pending.current)setPhase('retry');},15000);return()=>clearTimeout(timeout);},[phase]);
 const receive=useCallback((receipt:EnhancementReceipt,character:Character)=>{
  if(received.current===receipt.id)return;received.current=receipt.id;pending.current=null;setResult(receipt);setChanges(enhancementChanges({...latest.current,...character},receipt));
  clearTimeout(timer.current);timer.current=setTimeout(()=>setPhase('ready'),Math.max(0,started.current+1000-performance.now()));
 },[]);
 useEffect(()=>{const p=pending.current;if(!p)return;const receipt=c.enhancement?.history.find(r=>r.requestId===p.requestId);if(receipt)receive(receipt,c);},[c,receive]);
 async function execute(){
  if(inFlight.current||busy||active)return;
  const request=pending.current||(current?{requestId:crypto.randomUUID(),sequence:(c.enhancement?.sequence||0)+1,item:selected,mode,expectedEn:current.en,info:current}:null);
  if(!request)return;pending.current=request;frozen.current=request.info;inFlight.current=true;started.current=performance.now();setPhase('charging');setConfirm(false);setResult(null);setChanges([]);
  try{
   const response=await act({type:'enhance',item:request.item,mode:request.mode,expectedEn:request.expectedEn,requestId:request.requestId,sequence:request.sequence});
   const character=response?.save?.characters.find((ch:Character)=>ch.id===c.id) as Character|undefined,receipt=character?.enhancement?.history.find(r=>r.requestId===request.requestId);
   if(character&&receipt)receive(receipt,character);else if(pending.current)setPhase('retry');
  }catch{if(pending.current)setPhase('retry');}finally{inFlight.current=false;}
 }
 function reveal(){if(phase!=='ready'||!result)return;setPhase('revealing');clearTimeout(timer.current);timer.current=setTimeout(()=>setPhase('result'),result.outcome==='success'?1050:900);}
 const canStart=!!current&&!busy&&(c.bag[current.scroll]||0)>=current.need&&!c.locked?.includes(current.scroll);
 const canContinue=!!result&&result.outcome!=='destroyed'&&!!c.bag[result.key]&&(auto?(()=>{try{const next=enhancementInfo(c,result.key,auto);return (c.bag[next.scroll]||0)>=next.need;}catch{return false;}})():modes.some(([id])=>{try{enhancementInfo(c,result.key,id);return true;}catch{return false;}}));
 // Automatic mode: start as soon as the item is ready, then reveal without a tap.
 useEffect(()=>{if(auto&&autoRun.current&&phase==='select'&&canStart){autoRun.current=false;void execute();}});
 useEffect(()=>{if(auto&&phase==='ready')reveal();});
 const close=()=>onDone(result?.outcome==='destroyed'?null:result&&c.bag[result.key]?result.key:c.bag[selected]?selected:null);
 const showId=result?.item||selected,label=itemDisplayName(showId,c.lootAppearance),before=display?.en??result?.from??c.enh[selected]??0;
 return <section className="enhancement-workbench" data-phase={phase} data-outcome={outcome||'hidden'}>
  <header className="enhancement-header"><div><span>ENCHANTMENT</span><h2>裝備強化</h2></div><strong>{label}</strong></header>
  <div className="enhancement-body">
   {phase==='select'&&!auto&&<div className="enhancement-modes" role="group" aria-label="強化方式">{options.map(row=><Button key={row.id} variant={row.id===mode?'default':'outline'} disabled={busy||!row.info} title={row.error||row.name} aria-pressed={row.id===mode} onClick={()=>setMode(row.id)}>{row.name}</Button>)}</div>}
   <button type="button" className={'enhancement-stage '+(outcome||'')} aria-label={phase==='ready'?'點擊揭曉強化結果':'強化動畫'} aria-disabled={phase!=='ready'} tabIndex={phase==='ready'?0:-1} onClick={reveal}>
    <svg className="enhancement-rune" viewBox="0 0 200 200" aria-hidden="true"><defs><path id={'enhance-ring-'+c.id} d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0"/></defs><text><textPath href={'#enhance-ring-'+c.id}>✦ Ⅰ · Ⅱ · Ⅲ · Ⅳ · Ⅴ · Ⅵ · Ⅶ · Ⅷ · ✦ Ⅰ · Ⅱ · Ⅲ · Ⅳ ·</textPath></text></svg><span className="enhancement-ring" aria-hidden="true"/><span className="enhancement-flare" aria-hidden="true"/>
    {phase==='select'?<span className="enhancement-ingredients"><span>{current?<><EquipmentIcon id={current.scroll} c={c} size={64}/><span style={{display:'grid',gap:2,marginTop:6,fontSize:12,lineHeight:1.4,textAlign:'center',whiteSpace:'nowrap'}}><span>持有 {(c.bag[current.scroll]||0).toLocaleString()} 張</span><span style={{color:(c.bag[current.scroll]||0)<current.need?'#f9a782':'#b6a382'}}>每次消耗 {current.need.toLocaleString()} 張</span></span></>:<span>卷軸</span>}</span><b>＋</b><span><EquipmentIcon id={selected} c={c}/><small>+{before}</small></span></span>:<><span className="enhancement-main-icon"><EquipmentIcon id={showId} c={c}/></span>{outcome==='destroyed'&&<span className="enhancement-fragments" aria-hidden="true">{[[-54,-48,-30],[56,-42,35],[-46,56,-40],[51,52,45]].map(([x,y,r],i)=><span key={i} className={'enhancement-fragment fragment-'+i} style={{'--fragment-x':x+'px','--fragment-y':y+'px','--fragment-rotate':r+'deg'} as CSSProperties}><EquipmentIcon id={showId} c={c}/></span>)}</span>}<span className="enhancement-ashes" aria-hidden="true">{Array.from({length:8},(_,i)=><i key={i} style={{'--ash-i':i} as CSSProperties}/>)}</span></>}
   </button>
   {!resultVisible&&<p className="enhancement-stage-status" role="status">{phase==='charging'?'卷軸力量凝聚中…':phase==='ready'?'結果已準備完成，點擊揭曉':phase==='revealing'?'強化結果揭曉中…':phase==='retry'?'結果尚未確認。重試確認會使用同一筆請求。':current?'+'+current.en+' → '+target(current):options.find(row=>row.id===mode)?.error||'請選擇強化方式'}</p>}
   {phase==='select'&&current&&<>{hasUnlimitedWeaponGrowth(selected,current.i)?<p className="enhancement-rule">武器強化無上限 · 共通強化加成：傷害 +{weaponGrowth(current.en).damage}、命中 +{weaponGrowth(current.en).hit}。</p>:current.i.lwMythicId&&Number.isFinite(current.cap)&&<p className="enhancement-rule">玩家強化上限 +{current.cap}。</p>}<p className="enhancement-rule">{current.refined?'使用必成卷軸':current.i.enhSucc!==undefined?'活動道具固定機率':current.i.source==='apang381'?'裝備原生強化規則':'永夜強化規則'}</p><EnhancementSafety id={selected} item={current.i} en={current.en}/><div className="enhancement-rates"><p>成功 <b>{pct(current.chance)}</b></p><p>維持 <b>{pct(current.hold)}</b></p><p>消失 <b>{pct(current.destroy)}</b></p></div><div className="enhancement-cost"><span>{items[current.scroll]?.n} ×{current.need}</span><span>持有 {c.bag[current.scroll]||0} 張</span></div>{(c.bag[current.scroll]||0)<current.need&&<p className="enhancement-warning">卷軸不足</p>}{c.locked?.includes(current.scroll)&&<p className="enhancement-warning">卷軸已鎖定，請先解除鎖定。</p>}</>}
   {resultVisible&&result&&<EnhancementResultPanel result={result} changes={changes}/>}
  </div>
  <footer className="enhancement-footer">
   {phase==='select'&&!auto&&<><Button className="gold-button" disabled={!canStart} onClick={()=>setConfirm(true)}>開始強化</Button><Button variant="outline" disabled={busy} onClick={()=>onDone(null)}>更換裝備</Button></>}
   {phase==='ready'&&<Button className="gold-button" onClick={reveal}>點擊揭曉</Button>}
   {phase==='retry'&&<Button className="gold-button" disabled={busy} onClick={()=>void execute()}>確認上次強化結果</Button>}
   {resultVisible&&<><Button className="gold-button" disabled={busy||!canContinue} onClick={()=>{if(!result||!canContinue)return;setSelected(result.key);setMode(auto||'normal');setResult(null);setChanges([]);frozen.current=null;autoRun.current=!!auto;setPhase('select');}}>繼續強化</Button><Button variant="outline" disabled={busy} onClick={()=>onDone(null)}>更換裝備</Button></>}
   {!active&&<Button variant="outline" disabled={busy} onClick={close}>關閉強化</Button>}
  </footer>
  <AlertDialog open={confirm} onOpenChange={setConfirm}><AlertDialogContent className="game-dialog enhancement-confirmation"><AlertDialogTitle>確認強化</AlertDialogTitle><AlertDialogDescription>{current?label+' +'+current.en+'，消耗 '+current.need+' 張'+items[current.scroll]?.n+'。成功 '+pct(current.chance)+'、維持 '+pct(current.hold)+'、消失 '+pct(current.destroy)+'；成功提升至 '+target(current)+'。破壞只會消失選中的這一件裝備。':'裝備狀態已改變，請重新選擇。'}</AlertDialogDescription><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><Button className="gold-button" disabled={!canStart} onClick={()=>void execute()}>確認衝裝</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </section>;
}

