'use client';
import type {Character} from '@/lib/game/engine';
import type {BattleView} from './use-combat-replay';
export default function WorldBossControls({c,view,busy,act,onLobby}:{c:Character;view:BattleView;busy:boolean;act:(a:any)=>unknown;onLobby?:()=>void}){
 const waiting=!view.arena.some(m=>m.hp>0);
 return <div className="world-boss-controls battle-bottom-controls" aria-label="狩獵操作"><button type="button" className="world-boss-attack" disabled={busy||waiting&&!c.running} onClick={()=>act({type:'run',value:!c.running})}>{c.running?'停止狩獵':'開始狩獵'}</button><button type="button" className="world-boss-return" disabled={busy} onClick={onLobby}>返回大廳</button></div>;
}
