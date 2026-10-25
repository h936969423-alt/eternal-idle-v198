import type {CombatFloat} from '@/lib/game/combat-presentation';
import {combatFloatLayout} from '@/lib/game/combat-float-layout';
import {damageDisplay} from '@/lib/game/damage-display';
export default function DamageNumber({event}:{event:CombatFloat}){
 const display=damageDisplay(event);
 return <span className={`combat-float monster-float ${display.kind} ${event.critical&&!event.miss?'critical':''}`} style={combatFloatLayout(event.lane)}>{display.text}</span>;
}

