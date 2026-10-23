'use client';
import {playableBoss,bossMembers,bossName} from '@/lib/game/boss-respawn';
import {monsterData} from '@/lib/game/monster-runtime';
import type {Character} from '@/lib/game/engine';
import type {BattleView} from './use-combat-replay';
export default function WorldBossVitals({c,view}:{c:Character;view:BattleView}){
 if(!playableBoss(c.zone))return null;
 const members=bossMembers(c.zone),present=new Set([...Object.keys(c.bossRooms?.[c.zone]?.ledger?.participants||{}),c.id]).size;
 return <section className="world-boss-vitals" aria-label="世界王血量"><h3 className="world-boss-stage-heading"><span className="world-boss-badge">世界王</span><span className="world-boss-stage-name">{bossName(c.zone)}</span><small title="本帳號實際參戰角色">參戰 {present} 位</small></h3>{!view.arena.length?<p>等待世界王重生</p>:<div className="world-boss-health-list">{view.arena.filter(m=>!m.summonedBy).map((m,index)=>{
 const mob=monsterData(c,m.id,m),max=Math.max(1,m.maxHp??m.definition?.hp??members[index]?.hp??mob?.hp??1),hp=Math.max(0,Math.min(max,m.hp)),percent=hp/max*100;
 const label=hp===0?'0.00':hp===max?'100.00':Math.min(99.99,Math.max(.01,percent)).toFixed(2);
 return <div className={`world-boss-health ${hp===0?'defeated':''}`} key={m.uid}>{view.arena.length>1&&<div className="world-boss-health-heading"><span title={mob?.n||m.id}>{mob?.n||m.id} · {index+1}</span><strong>{label}%</strong></div>}<div className="world-boss-health-track" role="progressbar" aria-label={`${mob?.n||m.id}血量`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number(label)} aria-valuetext={`${label}%${hp===0?'，已擊敗':''}`}><span style={{width:`${percent}%`}}/><b>{hp.toLocaleString('zh-TW')} / {max.toLocaleString('zh-TW')}{view.arena.length===1&&<small>{label}%</small>}</b></div></div>;
 })}</div>}</section>;
}
