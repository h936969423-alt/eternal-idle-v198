import type {CombatEvent} from './engine';
export type QueuedLoot=CombatEvent&{loot:NonNullable<CombatEvent['loot']>};
/** Event sequence is authoritative. Animation backlogs never modify the reward ledger. */
export function enqueueLoot(events:CombatEvent[],seen:number,pending:QueuedLoot[]){const fresh=events.filter(e=>e.seq>seen),nextSeen=fresh.reduce((n,e)=>Math.max(n,e.seq),seen),added=fresh.filter((e):e is QueuedLoot=>e.kind==='loot'&&!!e.loot&&e.loot.style.effect!=='off');return {seen:nextSeen,queue:[...pending,...added].slice(-80)};}
