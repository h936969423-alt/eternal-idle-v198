import type {CombatFloat} from '@/lib/game/combat-presentation';
import {damageDisplay} from '@/lib/game/damage-display';
export default function DamageNumber({event}:{event:CombatFloat}){
 const display=damageDisplay(event);
 return <span className={`combat-float monster-float ${display.kind} ${event.critical&&!event.miss?'critical':''}`} style={{top:`calc(-10px - ${event.lane*28}px)`}}>{display.text}</span>;
}
