'use client';
import {mapIsOpen} from '@/lib/game/map-access';
import {useEffect,useState} from 'react';
import raw from '@/lib/game/gamedata.json';
import {playableBoss,bossName,bossWait} from '@/lib/game/boss-respawn';
import type {Character} from '@/lib/game/engine';
import {ACTIVE_DRAGON381} from '@/lib/game/dragon-availability';
const bosses=raw.worldBosses as Record<string,any>;
export default function BossRoomList({c,busy,act,inspect}:{c:Character;busy:boolean;act:(a:any)=>Promise<any>;inspect:(id:string)=>void}){
 const [now,setNow]=useState(Date.now());useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t);},[]);
 function room(id:string,b:any){if(!mapIsOpen(id,c.mapAccess))return null;const config=playableBoss(id),enabled=!!config&&c.bossGeneration?.[id]?.enabled!==false,until=c.bossRooms?.[id]?.respawnAt||0,waiting=until>now;return <article className="boss-room-row" key={id}><button className="reference-map-row" onClick={()=>inspect(id)}><span>{bossName(id)}</span><span>Lv.{b.minLv||0} · 查看</span></button><div><span>{enabled?waiting?`重生倒數 ${bossWait(until,now)}`:`可挑戰 · 擊殺後 ${(c.bossGeneration?.[id]?.respawnSeconds||config!.respawnMs/1000)/60} 分鐘重生${config!.scheduleInferred?'（依標記重建）':''}${b.enterGold?` · 入場 ${b.enterGold.toLocaleString()} 金幣`:''}`:c.bossGeneration?.[id]?.enabled===false?'GM 已暫停生成':'重生排程未確認，暫未開放'}</span>{enabled&&<button className="boss-enter" disabled={busy||waiting||c.lv<(b.minLv||0)} onClick={()=>act({type:'zone',zone:id})}>{waiting?'等待重生':c.zone===id?'目前王房':'進入王房'}</button>}</div></article>;}
 return <div className="zone-list"><section className="dragon381-rooms"><h3>3.81 恐怖四龍</h3><p className="section-hint">可選擇目前開放的恐怖四龍；其餘版本暫停。擊敗後 4 小時重生。</p>{ACTIVE_DRAGON381.map(r=>room(r.zone,bosses[r.zone]))}</section><p className="section-hint">單人世界王；雙龍與四王共用王房。擊敗全組才開始重生倒數。</p>{Object.entries(bosses).filter(([,b])=>!b.dragon381).map(([id,b])=>room(id,b))}</div>;
}
