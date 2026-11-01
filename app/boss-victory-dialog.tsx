'use client';
import ItemIcon from './item-icon';
import ItemLabel from './item-label';
import {useEffect,useState} from 'react';
import {useBossBurstPlaying} from './boss-burst-store';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import raw from '@/lib/game/gamedata.json';
import assets from '@/lib/game/asset-map.json';
import type {Character} from '@/lib/game/engine';
import type {BattleView} from './use-combat-replay';
const sourceNames:Record<string,string>={unrecorded:'舊版未分類傷害',physical:'人物攻擊',magic:'人物／武器魔法',pet:'寵物',summon:'召喚物',doll:'魔法娃娃',poison:'持續傷害'};
const nf=(n:number)=>Math.floor(n).toLocaleString('zh-TW');
export default function BossVictoryDialog({c,view,blocked,busy,act}:{c:Character;view:BattleView;blocked:boolean;busy:boolean;act:(a:any)=>unknown}){
 const [closedId,setClosedId]=useState<string|null>(null),[settledId,setSettledId]=useState<string|null>(null),r=c.lastBossVictory,bursting=useBossBurstPlaying();
 const awaitingReplay=!!r&&c.zone===r.zone&&view.arena.some(m=>r.encounterIds.includes(m.uid)&&m.hp>0);
 const eligible=!!r&&!r.seen&&closedId!==r.id&&!blocked&&!awaitingReplay;
 // Give the loot burst a moment to start after the boss falls, then wait for it to finish.
 useEffect(()=>{if(!eligible||!r||settledId===r.id)return;const t=setTimeout(()=>setSettledId(r.id),500);return()=>clearTimeout(t);},[eligible,r,settledId]);
 if(!r)return null;
 const open=eligible&&settledId===r.id&&!bursting;
 const close=()=>{setClosedId(r.id);void act({type:'bossVictoryDismiss',characterId:c.id,id:r.id});};
 return <Dialog open={open} onOpenChange={value=>{if(!value)close();}}><DialogContent className="boss-victory-dialog" showCloseButton={false}><header><DialogTitle>⚔ 世界王已被擊敗！</DialogTitle><DialogDescription>{r.name} 已被擊敗！</DialogDescription></header><div className="boss-victory-scroll"><section><h3>掉落分配</h3>{r.participants.filter(p=>p.xp>0).map(p=><div className="boss-victory-income" key={`xp-${p.id}`}><span aria-hidden="true">✨</span><span>經驗 +{nf(p.xp)}</span><strong>{p.name}</strong></div>)}{r.participants.filter(p=>p.gold>0).map(p=><div className="boss-victory-income" key={`gold-${p.id}`}><span aria-hidden="true">💰</span><span>金幣 +{nf(p.gold)}</span><strong>{p.name}</strong></div>)}<div className="boss-victory-drops">{r.participants.flatMap(p=>Object.entries(p.drops).map(([id,quantity])=>{const item=(raw.items as Record<string,any>)[id],src=item?.sourceIcon||(assets.icons.items as Record<string,string>)[item?.n];return <div key={`${p.id}-${id}`}>{src?<ItemIcon itemId={id} appearance={c.lootAppearance} src={src} alt={item?.n||id}/>:<span className="boss-drop-placeholder" aria-hidden="true">🎁</span>}<div><span><ItemLabel item={id} appearance={c.lootAppearance}/> ×{nf(quantity)}</span><strong>{p.name}</strong></div></div>;}))}{!Object.keys(r.drops).length&&<p className="boss-victory-empty">本次未掉落物品</p>}</div></section><section><h3>傷害排名</h3><p className="boss-victory-empty">依本帳號實際參戰角色統計，含各自夥伴傷害。</p>{[...r.participants].filter(p=>p.damage>0).sort((a,b)=>b.damage-a.damage).map((p,index)=><div className="boss-victory-rank" key={p.id}><b>{index+1}</b><span>{p.name}</span><strong>{nf(p.damage)}</strong></div>)}<div className="boss-victory-breakdown">{Object.entries(r.damageBy).sort((a,b)=>b[1]-a[1]).map(([source,damage])=><div key={source}><span>{sourceNames[source]||source}</span><span>{nf(damage)}</span></div>)}</div>{r.partial&&<p className="boss-victory-empty">本場於更新前已開始，統計從更新後接續記錄。</p>}</section></div><footer><Button className="gold-button" disabled={busy} onClick={close}>關閉</Button></footer></DialogContent></Dialog>;
}
