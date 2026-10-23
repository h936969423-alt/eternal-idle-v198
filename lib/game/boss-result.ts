import {bossName,playableBoss} from './boss-respawn';
import {isPausedDragonZone} from './dragon-availability';
import type {Character,CombatEvent,Encounter} from './engine';
export type BossParticipant={pending?:{xp:number;gold:number;drops:Record<string,number>};damageBy?:Record<string,number>;id:string;name:string;xp:number;gold:number;drops:Record<string,number>;damage:number};
export type BossBattleLedger={startedAt:number;xp:number;gold:number;drops:Record<string,number>;damageBy:Record<string,number>;partial:boolean;participants:Record<string,BossParticipant>;finishedAt?:number};
export type BossVictoryReceipt={id:string;zone:string;name:string;characterId:string;characterName:string;defeatedAt:number;encounterIds:string[];xp:number;gold:number;drops:Record<string,number>;damage:number;damageBy:Record<string,number>;partial:boolean;participants:BossParticipant[];seen:boolean};
export function newBossLedger(now:number,partial=false):BossBattleLedger{return {startedAt:now,xp:0,gold:0,drops:{},damageBy:{},partial,participants:{}};}
function ledger(c:Character,now:number){const room=c.bossRooms?.[c.zone];if(!room||room.respawnAt>0||!playableBoss(c.zone))return;return room.ledger||=(newBossLedger(now,room.arena.some(m=>m.hp<=0||m.maxHp!==undefined&&m.hp<m.maxHp)));}
function participant(b:BossBattleLedger,c:Character){b.participants||={};return b.participants[c.id]||=( {id:c.id,name:c.name,xp:0,gold:0,drops:{},damage:0} );}
export function recordBossDamage(c:Character,target:Encounter,damage:number,source:CombatEvent['source'],now:number){const room=c.bossRooms?.[c.zone];if(target.summonedBy||!room?.arena.some(m=>m.uid===target.uid)||damage<=0)return;const b=ledger(c,now);if(b&&!b.finishedAt){const key=source||'physical';b.damageBy[key]=(b.damageBy[key]||0)+damage;const p=participant(b,c);p.damageBy||={...(p.damage?{unrecorded:p.damage}:{})};p.damageBy[key]=(p.damageBy[key]||0)+damage;p.damage+=damage;}}
export function recordBossReward(c:Character,xp:number,gold:number,now:number,pending=false){const b=ledger(c,now);if(b&&!b.finishedAt){b.xp+=xp;b.gold+=gold;const p=participant(b,c);p.xp+=xp;p.gold+=gold;if(pending){p.pending||={xp:0,gold:0,drops:{}};p.pending.xp+=xp;p.pending.gold+=gold;}}}
export function recordBossDrop(c:Character,item:string,quantity:number,pending=false){const b=c.bossRooms?.[c.zone]?.ledger;if(b&&!b.finishedAt){b.drops[item]=(b.drops[item]||0)+quantity;const p=participant(b,c);p.drops[item]=(p.drops[item]||0)+quantity;if(pending){p.pending||={xp:0,gold:0,drops:{}};p.pending.drops[item]=(p.pending.drops[item]||0)+quantity;}}}
export function finishBossBattle(c:Character,now:number){const room=c.bossRooms?.[c.zone],b=ledger(c,now);if(!room||!b||b.finishedAt||room.arena.some(m=>m.hp>0))return;b.finishedAt=now;c.lastBossVictory={id:`${c.zone}:${room.arena[0]?.uid||now}`,zone:c.zone,name:bossName(c.zone),characterId:c.id,characterName:c.name,defeatedAt:now,encounterIds:room.arena.map(m=>m.uid),xp:b.xp,gold:b.gold,drops:{...b.drops},damage:Object.values(b.damageBy).reduce((sum,n)=>sum+n,0),damageBy:{...b.damageBy},partial:b.partial,participants:structuredClone(Object.values(b.participants||{}).map(({pending,...p})=>p)),seen:false};}
export function acknowledgeBossVictory(c:Character,id:unknown){if(typeof id==='string'&&c.lastBossVictory?.id===id)c.lastBossVictory.seen=true;}

/** Discard one unfinished participation without restoring boss HP or removing other characters. */
export function resetBossParticipation(c:Character){
 const b=c.bossRooms?.[c.zone]?.ledger,p=b?.participants?.[c.id];
 if((!playableBoss(c.zone)&&!isPausedDragonZone(c.zone))||!b||b.finishedAt||!p)return false;
 delete b.participants[c.id];
 b.xp=0;b.gold=0;b.drops={};b.damageBy={};
 for(const remaining of Object.values(b.participants)){
  b.xp+=remaining.xp;b.gold+=remaining.gold;
  for(const [id,n] of Object.entries(remaining.drops))b.drops[id]=(b.drops[id]||0)+n;
  const sources=remaining.damageBy||{unrecorded:remaining.damage};
  if(!remaining.damageBy&&remaining.damage)b.partial=true;
  for(const [source,n] of Object.entries(sources))if(n)b.damageBy[source]=(b.damageBy[source]||0)+n;
 }
 return true;
}
