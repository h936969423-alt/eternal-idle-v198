'use client';
import {useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';
import {MAX_CHARACTERS} from '@/lib/game/character-menu';
import type {Save} from '@/lib/game/engine';
const classes:Record<string,string>={royal:'王族',knight:'騎士',elf:'妖精',mage:'法師',dark:'黑暗妖精'};
export default function CharacterMenu({save,busy,error,serverOffset,onEnter,onCreate,act,onRefresh}:{save:Save;busy:boolean;error:string;serverOffset:number;onEnter:(id:string)=>Promise<void>;onCreate:()=>void;act:(a:any)=>Promise<any>;onRefresh:()=>void}){
 const [now,setNow]=useState(()=>Date.now());
 const hasPending=!!Object.keys(save.characterDeletions||{}).length;
 useEffect(()=>{if(!hasPending)return;setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),100);return()=>clearInterval(timer);},[hasPending]);
 return <main className="character-menu-page"><header><span className="eyebrow">ETERNAL IDLE REALM</span><h1>永夜 · 人物選單</h1><p>選擇角色，繼續你的冒險。</p><span>{save.characters.length} / {MAX_CHARACTERS} 位角色</span></header>{error&&<div className="error-banner" role="alert">{error}<Button variant="outline" onClick={onRefresh}>重新連線</Button></div>}<section className="character-menu-grid" aria-label="人物列表">{save.characters.map(c=>{
 const pending=save.characterDeletions?.[c.id],seconds=pending?Math.max(0,Math.ceil((pending.deleteAt-now-serverOffset)/1000)):0;
 return <article className={`character-menu-card ${pending?'deletion-pending':''}`} key={c.id}>
 <img className="character-menu-portrait" src={`/assets/character/${c.gender==='f'?'女':'男'}${classes[c.cls]}.${c.cls==='dark'?'png':'jpg'}`} alt={classes[c.cls]}/><h2>{c.name}</h2><p>Lv.{c.lv} · {classes[c.cls]}</p><small>{c.running?'狩獵中':'休息中'}</small>
 {pending?<div className="character-delete-status"><p role="status">{seconds>0?`${seconds} 秒後刪除角色`:'正在確認刪除結果…'}</p><Button variant="outline" disabled={busy||seconds<=0} onClick={()=>act({type:'cancelCharacterDeletion',id:c.id,token:pending.token})}>取消刪除</Button></div>:<div className="character-menu-actions"><Button className="gold-button" disabled={busy} onClick={()=>void onEnter(c.id)}>進入遊戲</Button><Button className="delete-character-button" variant="outline" disabled={busy} onClick={()=>act({type:'deleteCharacter',id:c.id})}>刪除角色</Button></div>}
 </article>;
 })}{save.characters.length<MAX_CHARACTERS&&<button className="character-menu-card character-menu-create" disabled={busy} onClick={onCreate}><span aria-hidden="true">＋</span><strong>建立角色</strong><small>尚可建立 {MAX_CHARACTERS-save.characters.length} 位</small></button>}</section><footer><p>每個帳號最多建立 3 位角色。刪除後，該角色與隨身裝備、背包及角色倉庫會一併移除。</p><p>按下刪除後倒數 10 秒，期間可取消刪除；倒數結束後無法復原。</p></footer></main>;
}

