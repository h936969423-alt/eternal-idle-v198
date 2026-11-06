'use client';
import type {Character} from '@/lib/game/engine';
import type {BattleView} from './use-combat-replay';
export default function WorldBossControls({c,view,busy,act}:{c:Character;view:BattleView;busy:boolean;act:(a:any)=>unknown}){
 const waiting=!view.arena.some(m=>m.hp>0);
 return <div className="world-boss-controls battle-bottom-controls" aria-label="狩獵操作"><button type="button" className="world-boss-attack" aria-label={c.running?'停止狩獵':'開始狩獵'} aria-pressed={c.running} disabled={busy||waiting&&!c.running} onClick={()=>act({type:'run',value:!c.running})}><span className="hunt-action-label">{c.running?'停止狩獵':'開始狩獵'}</span><span className="hunt-auto-label" aria-hidden="true">AUTO</span></button></div>;
}

