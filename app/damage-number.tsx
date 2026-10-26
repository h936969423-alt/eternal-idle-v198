import type {CombatFloat} from '@/lib/game/combat-presentation';
import {combatFloatLayout} from '@/lib/game/combat-float-layout';
import {damageDisplay,damageSourceLabel} from '@/lib/game/damage-display';
export default function DamageNumber({event}:{event:CombatFloat}){
 const display=damageDisplay(event),source=damageSourceLabel(event);
 return <span className={`combat-float monster-float ${display.kind} ${event.critical&&!event.miss?'critical':''}`} style={combatFloatLayout(event.lane)} aria-label={`${source||'普攻'} ${display.text}`} title={source||'普攻'}>{source&&<small style={{fontSize:10,fontWeight:600,marginRight:3,WebkitTextStroke:0}}>{source}</small>}{display.text}</span>;
}


