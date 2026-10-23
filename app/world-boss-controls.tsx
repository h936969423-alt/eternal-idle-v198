'use client';
import type {Character} from '@/lib/game/engine';
import type {BattleView} from './use-combat-replay';
export default function WorldBossControls({c,view,busy,act,onLobby}:{c:Character;view:BattleView;busy:boolean;act:(a:any)=>unknown;onLobby?:()=>void}){
 const waiting=!view.arena.some(m=>m.hp>0);
 return <div className="world-boss-controls"><button type="button" className="world-boss-return" disabled={busy} onClick={onLobby}>返回大廳</button><button type="button" className="world-boss-attack" disabled={busy||waiting} onClick={()=>act({type:'run',value:!c.running})}>{waiting?'等待重生':c.running?'Ⅱ 停止攻擊':'⚔ 攻擊'}</button></div>;
}
